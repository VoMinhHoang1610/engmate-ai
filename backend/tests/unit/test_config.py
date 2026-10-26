"""Check configuration and fail early for unsupported providers."""

import pytest
from pydantic import SecretStr, ValidationError

from app.core.config import Settings, get_settings
from app.main import create_app


def test_environment_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    """Environment overrides affect the application factory."""
    monkeypatch.setenv("APP_NAME", "Test App")
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.setenv("VOICE_PROVIDER", "native")
    monkeypatch.setenv("CORS_ORIGINS", " http://localhost:1234, ")
    settings = get_settings()
    assert settings.cors_origins == ["http://localhost:1234"]
    assert settings.voice_provider == "native"
    assert create_app().title == "Test App"


def test_unsupported_provider(monkeypatch: pytest.MonkeyPatch) -> None:
    """Do not silently substitute mock output for a real provider."""
    monkeypatch.setenv("LLM_PROVIDER", "unknown")
    with pytest.raises(ValidationError):
        get_settings()


def test_runtime_mock_is_forbidden(monkeypatch: pytest.MonkeyPatch) -> None:
    """Even explicit runtime configuration cannot activate canned answers."""
    monkeypatch.setenv("LLM_PROVIDER", "mock")
    with pytest.raises(ValueError, match="test-only"):
        get_settings()


def test_voice_defaults_to_blaze_and_rejects_unknown_providers() -> None:
    """Separate speech selection from the text provider without silent fallback."""
    assert Settings().voice_provider == "blaze"
    with pytest.raises(ValidationError):
        Settings.model_validate({"voice_provider": "browser"})


def test_malformed_database_url_hides_credentials() -> None:
    """Invalid connection configuration never prints credential input."""
    with pytest.raises(ValidationError) as error:
        Settings(database_mysql_url=SecretStr("private-password-not-a-url"))
    assert "private-password" not in str(error.value)
