"""Check configuration and fail early for unsupported providers."""

import pytest
from pydantic import ValidationError

from app.core.config import get_settings
from app.main import create_app


def test_environment_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    """Environment overrides affect the application factory."""
    monkeypatch.setenv("APP_NAME", "Test App")
    monkeypatch.setenv("LLM_PROVIDER", "mock")
    monkeypatch.setenv("CORS_ORIGINS", " http://localhost:1234, ")
    settings = get_settings()
    assert settings.cors_origins == ["http://localhost:1234"]
    assert create_app().title == "Test App"


def test_unsupported_provider(monkeypatch: pytest.MonkeyPatch) -> None:
    """Do not silently substitute mock output for a real provider."""
    monkeypatch.setenv("LLM_PROVIDER", "unknown")
    with pytest.raises(ValidationError):
        get_settings()
