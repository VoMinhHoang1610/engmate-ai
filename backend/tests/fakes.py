"""Offline model doubles; never imported by application/runtime modules."""

from collections.abc import AsyncIterator

from app.llm.base import ContextMessage
from app.schemas.ai import Level


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
