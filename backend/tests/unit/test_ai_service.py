"""Verify provider injection, level context and the versioned prompt."""

from unittest.mock import AsyncMock

import pytest

from app.schemas.ai import ReplyRequest
from app.services.ai_service import AIService


@pytest.mark.anyio
async def test_service_passes_prompt_and_level() -> None:
    """Application logic is independent of external AI SDKs."""
    provider = AsyncMock()
    provider.generate.return_value = "Practice reply"
    result = await AIService(provider).reply(ReplyRequest(message="Hello", level="B1"))
    assert result.reply == "Practice reply"
    assert result.provider == "mock"
    assert result.level == "B1"
    args = provider.generate.await_args.args
    assert args[:2] == ("Hello", "B1")
    assert "friendly English practice companion" in args[2]
    assert "Pre-A1" in args[2] and "C2" in args[2]
    assert "Version: 2." in args[2]
