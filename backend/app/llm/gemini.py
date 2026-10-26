"""Gemini GenerateContent SSE transport with private header authentication."""

import json
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
from fastapi import HTTPException

from app.core.config import Settings
from app.core.voice_timing import VoiceTimings
from app.llm.base import ContextMessage
from app.schemas.ai import Level

API_ORIGIN = "https://generativelanguage.googleapis.com/v1beta"
MAX_REPLY_CHARS = 12000


def provider_error(status: int) -> HTTPException:
    """Return safe, actionable errors without reflecting upstream request data."""
    if status == 429:
        return HTTPException(
            429, "Gemini hết quota hoặc đang giới hạn tốc độ. Thử lại sau."
        )
    if status in (400, 401, 403, 404):
        return HTTPException(503, "Kiểm tra khóa API, quyền truy cập và model Gemini.")
    return HTTPException(502, "Gemini tạm thời không phản hồi. Hãy thử lại.")


def contents(history: list[ContextMessage]) -> list[dict[str, object]]:
    """Map trusted role labels while keeping user history outside instructions."""
    return [
        {
            "role": "model" if message["role"] == "assistant" else "user",
            "parts": [{"text": message["content"]}],
        }
        for message in history
    ]


class GeminiLLMClient:
    """Implement the same conversation interface without a provider SDK."""

    def __init__(
        self,
        settings: Settings,
        transport: httpx.AsyncBaseTransport | None = None,
        *,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        """Support isolated HTTP transport tests and real backend credentials."""
        self.settings = settings
        self.transport = transport
        self.http_client = http_client

    @asynccontextmanager
    async def connection(self) -> AsyncIterator[httpx.AsyncClient]:
        """Borrow the lifespan pool without closing other concurrent requests."""
        if self.http_client is not None:
            yield self.http_client
            return
        async with httpx.AsyncClient(
            transport=self.transport,
            timeout=httpx.Timeout(30, connect=10),
            follow_redirects=False,
            trust_env=False,
        ) as client:
            yield client

    async def generate(
        self,
        message: str,
        level: Level,
        system_prompt: str,
        history: list[ContextMessage] | None = None,
    ) -> str:
        """Reuse the streaming implementation for the existing JSON endpoint."""
        return "".join(
            [part async for part in self.stream(message, level, system_prompt, history)]
        )

    async def stream(
        self,
        message: str,
        level: Level,
        system_prompt: str,
        history: list[ContextMessage] | None = None,
    ) -> AsyncIterator[str]:
        """Yield actual visible text and require a successful terminal candidate."""
        key = self.settings.gemini_api_key
        if not key:
            raise HTTPException(503, "GEMINI_API_KEY chưa được cấu hình.")
        payload = {
            "systemInstruction": {
                "parts": [{"text": system_prompt + f"\nLearner level: {level}"}]
            },
            "contents": contents(
                [*(history or []), {"role": "user", "content": message}]
            ),
            "generationConfig": {
                "maxOutputTokens": self.settings.gemini_max_output_tokens,
            },
        }
        total = 0
        completed = False
        timing = VoiceTimings()
        try:
            async with self.connection() as client:
                async with client.stream(
                    "POST",
                    API_ORIGIN
                    + "/models/"
                    + self.settings.gemini_chat_model
                    + ":streamGenerateContent",
                    params={"alt": "sse"},
                    headers={"x-goog-api-key": key.get_secret_value()},
                    json=payload,
                ) as response:
                    if response.status_code != 200:
                        raise provider_error(response.status_code)
                    async for line in response.aiter_lines():
                        if len(line) > 131072:
                            raise ValueError("Oversized provider event")
                        if not line.startswith("data:"):
                            continue
                        event = json.loads(line[5:].strip())
                        usage = event.get("usageMetadata")
                        if isinstance(usage, dict):
                            timing.count("input_tokens", usage.get("promptTokenCount"))
                            timing.count(
                                "output_tokens", usage.get("candidatesTokenCount")
                            )
                        if "error" in event:
                            raise provider_error(int(event["error"].get("code", 502)))
                        if event.get("promptFeedback", {}).get("blockReason"):
                            raise HTTPException(422, "Gemini từ chối nội dung yêu cầu.")
                        candidates = event.get("candidates", [])
                        if not candidates:
                            continue
                        candidate = candidates[0]
                        for part in candidate.get("content", {}).get("parts", []):
                            if part.get("thought") or "text" not in part:
                                continue
                            delta = part["text"]
                            if not isinstance(delta, str):
                                raise ValueError("Invalid provider text")
                            total += len(delta)
                            if total > MAX_REPLY_CHARS:
                                raise ValueError("Oversized reply")
                            if delta:
                                timing.mark("llm_first_text")
                            yield delta
                        finish = candidate.get("finishReason")
                        if finish:
                            if finish != "STOP":
                                raise HTTPException(
                                    502,
                                    "Gemini chưa hoàn tất câu trả lời. Hãy thử lại.",
                                )
                            completed = True
                            break
            if not completed or not total:
                raise ValueError("Incomplete or empty stream")
            timing.mark("llm_complete")
        except httpx.TimeoutException:
            raise HTTPException(
                504, "Gemini phản hồi quá thời gian cho phép."
            ) from None
        except (httpx.HTTPError, ValueError, TypeError, AttributeError, IndexError):
            raise HTTPException(
                502, "Phản hồi Gemini không hợp lệ hoặc bị ngắt."
            ) from None
