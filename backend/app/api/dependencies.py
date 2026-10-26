"""Choose the explicitly configured provider without silent mock fallback."""

from fastapi import HTTPException, Request

from app.llm.base import LLMClient
from app.llm.gemini import GeminiLLMClient
from app.llm.openai import OpenAILLMClient


def get_llm_client(request: Request) -> LLMClient:
    """Keep mock restricted to an explicit development/test configuration."""
    if not request.app.state.settings.chat_configured:
        raise HTTPException(
            503, "Configure the selected AI provider credentials for chat."
        )
    if request.app.state.settings.llm_provider == "gemini":
        return GeminiLLMClient(
            request.app.state.settings, http_client=request.app.state.gemini_http
        )
    return OpenAILLMClient(request.app.state.settings)
