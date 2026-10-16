"""Provider interface shared by mock and future real AI adapters."""

from collections.abc import AsyncIterator
from typing import Literal, Protocol, TypedDict

from app.schemas.ai import Level


class ContextMessage(TypedDict):
    """Keep conversation data separate from trusted instructions."""

    role: Literal["user", "assistant"]
    content: str


class LLMClient(Protocol):
    """Keep provider-specific SDKs outside routers and application services."""

    async def generate(
        self,
        message: str,
        level: Level,
        system_prompt: str,
        history: list[ContextMessage] | None = None,
    ) -> str:
        """Generate a reply using a versioned prompt and learner level."""
        ...

    def stream(
        self,
        message: str,
        level: Level,
        system_prompt: str,
        history: list[ContextMessage] | None = None,
    ) -> AsyncIterator[str]:
        """Yield text deltas from the provider; never manufacture an answer."""
        ...
