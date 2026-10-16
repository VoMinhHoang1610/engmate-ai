"""OpenAI Responses transport with bounded SSE parsing and no fake fallback."""

import json
from collections.abc import AsyncIterator

import httpx
from fastapi import HTTPException

from app.core.config import Settings
from app.llm.base import ContextMessage
from app.schemas.ai import Level

API_ORIGIN = "https://api.openai.com/v1"
MAX_REPLY_CHARS = 12000


def provider_error(status: int) -> HTTPException:
    """Expose actionable status without upstream body, tokens or request content."""
    return HTTPException(
        429 if status == 429 else 503 if status in (401, 403) else 502,
        (
            "OpenAI credentials/access unavailable."
            if status in (401, 403)
            else "OpenAI request failed; try again later."
        ),
    )


class OpenAILLMClient:
    """Use HTTPX already shared by speech; no second provider SDK is required."""

    def __init__(
        self, settings: Settings, transport: httpx.AsyncBaseTransport | None = None
    ) -> None:
        """Allow isolated HTTP transport tests without real network or credentials."""
        self.settings = settings
        self.transport = transport

    async def generate(
        self,
        message: str,
        level: Level,
        system_prompt: str,
        history: list[ContextMessage] | None = None,
    ) -> str:
        """Preserve the existing JSON API using the same streaming AI implementation."""
        return "".join(
            [
                chunk
                async for chunk in self.stream(message, level, system_prompt, history)
            ]
        )

    async def stream(
        self,
        message: str,
        level: Level,
        system_prompt: str,
        history: list[ContextMessage] | None = None,
    ) -> AsyncIterator[str]:
        """Read typed Responses SSE events and fail if a stream is incomplete."""
        key = self.settings.openai_api_key
        if not key:
            raise HTTPException(503, "OPENAI_API_KEY is not configured.")
        payload = {
            "model": self.settings.openai_chat_model,
            "instructions": system_prompt + f"\nLearner level: {level}",
            "input": [*(history or []), {"role": "user", "content": message}],
            "store": False,
            "stream": True,
            "max_output_tokens": self.settings.openai_max_output_tokens,
        }
        total = 0
        completed = False
        try:
            async with httpx.AsyncClient(
                transport=self.transport,
                timeout=httpx.Timeout(30, connect=10),
                follow_redirects=False,
                trust_env=False,
            ) as client:
                async with client.stream(
                    "POST",
                    API_ORIGIN + "/responses",
                    headers={"Authorization": "Bearer " + key.get_secret_value()},
                    json=payload,
                ) as response:
                    if response.status_code != 200:
                        raise provider_error(response.status_code)
                    async for line in response.aiter_lines():
                        if len(line) > 131072:
                            raise ValueError("Oversized provider event")
                        if not line.startswith("data: "):
                            continue
                        event = json.loads(line[6:])
                        kind = event.get("type")
                        if kind in (
                            "response.output_text.delta",
                            "response.refusal.delta",
                        ):
                            delta = event.get("delta")
                            if not isinstance(delta, str):
                                raise ValueError("Invalid text delta")
                            total += len(delta)
                            if total > MAX_REPLY_CHARS:
                                raise ValueError("Oversized reply")
                            yield delta
                        elif kind == "response.completed":
                            completed = True
                            break
                        elif kind in (
                            "error",
                            "response.failed",
                            "response.incomplete",
                        ):
                            error = (
                                event.get("error")
                                or event.get("response", {}).get("error")
                                or {}
                            )
                            if isinstance(error, dict) and (
                                error.get("code")
                                in ("credit_balance_exhausted", "insufficient_quota")
                                or error.get("type") == "insufficient_quota"
                            ):
                                raise HTTPException(
                                    429,
                                    "OpenAI đã hết credit/quota. "
                                    "Vui lòng kiểm tra billing của project.",
                                )
                            raise HTTPException(
                                502, "OpenAI generation did not complete."
                            )
            if not completed or total == 0:
                raise ValueError("Incomplete or empty provider stream")
        except httpx.TimeoutException:
            raise HTTPException(504, "OpenAI response timed out.") from None
        except (httpx.HTTPError, ValueError, TypeError, AttributeError):
            raise HTTPException(
                502, "Invalid or interrupted OpenAI response."
            ) from None
