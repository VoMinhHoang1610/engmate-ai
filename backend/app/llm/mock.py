"""Deterministic, free provider used by the starter and default tests."""

from app.schemas.ai import Level


class MockLLMClient:
    """Return a labelled demo response without network access."""

    async def generate(self, message: str, level: Level, system_prompt: str) -> str:
        """Echo the message; this output does not evaluate or correct English."""
        return f"[Mock/{level}] You said: {message}. What would you like to practice?"
