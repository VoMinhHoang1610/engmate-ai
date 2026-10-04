"""Application boundary between HTTP contracts and AI provider adapters."""

from pathlib import Path

from app.llm.base import LLMClient
from app.schemas.ai import ReplyRequest, ReplyResponse

PROMPT_PATH = Path(__file__).resolve().parents[1] / "prompts" / "persona.v1.txt"


class AIService:
    """Supply prompt context to an injected provider."""

    def __init__(self, client: LLMClient) -> None:
        """Accept an adapter instead of creating an external SDK in the service."""
        self.client = client

    async def reply(self, request: ReplyRequest) -> ReplyResponse:
        """Build a structured reply using the current mock implementation."""
        prompt = PROMPT_PATH.read_text(encoding="utf-8")
        reply = await self.client.generate(request.message, request.level, prompt)
        return ReplyResponse(reply=reply, level=request.level)
