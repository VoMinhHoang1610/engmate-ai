"""Dependency injection points for future provider implementations."""

from app.llm.mock import MockLLMClient
from app.services.ai_service import AIService


def get_ai_service() -> AIService:
    """Use the free mock until a real provider is deliberately implemented."""
    return AIService(MockLLMClient())
