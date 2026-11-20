"""Offline model doubles; never imported by application/runtime modules."""

import asyncio
import json
from collections.abc import AsyncIterator, Callable
from typing import Any

from app.llm.base import ContextMessage
from app.schemas.ai import Level

ScriptItem = str | dict[str, Any] | BaseException | Callable[[dict[str, Any]], str]


def generated_word(index: int) -> dict[str, object]:
    """Return one schema-valid generated word with a unique server-neutral term."""
    return {
        "term": f"word{index}",
        "part_of_speech": "noun",
        "ipa": "/tɜːm/",
        "meaning_vi": "nghĩa của từ",
        "example_en": f"This is word{index}.",
        "example_vi": "Đây là một câu ví dụ tiếng Việt.",
        "cefr": "A2",
    }


def generated_topic() -> dict[str, object]:
    """Return schema-valid display metadata for generated vocabulary."""
    return {
        "title_vi": "Chủ đề thử nghiệm",
        "title_en": "Test topic",
        "description": "Mô tả chủ đề thử nghiệm.",
    }


def generated_response(
    count: int,
    accepted: list[str] | None = None,
    words: list[dict[str, object]] | None = None,
) -> str:
    """Build one strict provider envelope; only tests use this helper."""
    existing = set(accepted or [])
    chosen = words
    if chosen is None:
        chosen = []
        index = 1
        while len(chosen) < count:
            candidate = generated_word(index)
            if str(candidate["term"]) not in existing:
                chosen.append(candidate)
            index += 1
    return json.dumps(
        {
            "status": "ok",
            "topic": generated_topic(),
            "words": chosen,
            "reason_code": None,
            "suggestions": [],
        },
        ensure_ascii=False,
    )


class MockLLMClient:
    """Keep deterministic response generation confined to tests."""

    async def generate(
        self,
        message: str,
        level: Level,
        system_prompt: str,
        history: list[ContextMessage] | None = None,
    ) -> str:
        """Return a labelled fixture answer without any upstream requests."""
        return f"[Mock/{level}] You said: {message}. What would you like to practice?"

    async def stream(
        self,
        message: str,
        level: Level,
        system_prompt: str,
        history: list[ContextMessage] | None = None,
    ) -> AsyncIterator[str]:
        """Emit fixture deltas for stream/persistence integration tests."""
        yield await self.generate(message, level, system_prompt, history)


class VocabularyScriptClient:
    """Return scripted provider envelopes and optionally block the first call."""

    def __init__(
        self,
        script: list[ScriptItem] | None = None,
        *,
        block_first: bool = False,
    ) -> None:
        """Keep scripts test-local and record every provider request."""
        self.script = list(script or [])
        self.block_first = block_first
        self.messages: list[dict[str, Any]] = []
        self.started = asyncio.Event()
        self.release = asyncio.Event()

    async def generate(
        self,
        message: str,
        level: Level,
        system_prompt: str,
        history: list[ContextMessage] | None = None,
    ) -> str:
        """Produce a valid batch by default; fail or block only when scripted."""
        request: dict[str, Any] = json.loads(message)
        self.messages.append(request)
        if self.block_first:
            self.block_first = False
            self.started.set()
            await self.release.wait()
        item = self.script.pop(0) if self.script else None
        if isinstance(item, BaseException):
            raise item
        if callable(item):
            return item(request)
        if isinstance(item, dict):
            return json.dumps(item, ensure_ascii=False)
        if isinstance(item, str):
            return item
        batch_size = int(request.get("batch_size", 6))
        accepted = [str(term) for term in request.get("accepted_terms", [])]
        return generated_response(batch_size, accepted)

    async def stream(
        self,
        message: str,
        level: Level,
        system_prompt: str,
        history: list[ContextMessage] | None = None,
    ) -> AsyncIterator[str]:
        """Keep the protocol complete even though generation calls generate()."""
        yield await self.generate(message, level, system_prompt, history)
