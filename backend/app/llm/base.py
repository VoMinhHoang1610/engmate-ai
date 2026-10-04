"""Provider interface shared by mock and future real AI adapters."""

from typing import Protocol

from app.schemas.ai import Level


class LLMClient(Protocol):
    """Keep provider-specific SDKs outside routers and application services."""

    async def generate(self, message: str, level: Level, system_prompt: str) -> str:
        """Generate a reply using a versioned prompt and learner level."""
        ...
