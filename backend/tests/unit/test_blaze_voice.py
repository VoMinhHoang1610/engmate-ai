"""Blaze owns speech while Gemini remains the text brain, without paid calls."""

from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import httpx
import pytest
from fastapi import Request
from fastapi.testclient import TestClient
from pydantic import SecretStr
from starlette.websockets import WebSocketDisconnect

from app.api.chat_routes import current_user
from app.api.dependencies import get_llm_client
from app.core.config import Settings
from app.llm.gemini import GeminiLLMClient
from app.main import create_app
from app.schemas.speech import SpeechVoice
from app.services.gemini_voice import GeminiVoiceManager
from app.services.realtime import RealtimeManager
from app.services.speech import SpeechService


@pytest.mark.anyio
@pytest.mark.parametrize(
    "brain,speech,chat_available,voice_available",
    [(False, True, False, False), (True, False, True, False), (True, True, True, True)],
)
async def test_capabilities_require_both_services(
    brain: bool, speech: bool, chat_available: bool, voice_available: bool
) -> None:
    """A working chat credential alone cannot advertise Blaze speech readiness."""
    app = create_app(
        Settings(
            gemini_api_key=SecretStr("test-brain") if brain else None,
            blaze_api_key=SecretStr("test-speech") if speech else None,
        )
    )
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/capabilities")
    data = response.json()
    assert data["provider"] == "gemini" and data["voice_provider"] == "blaze"
    assert data["chat"] is chat_available
    assert data["streaming"] is chat_available
    assert data["speech"] is speech
    assert data["realtime"] is voice_available
    assert (data["reason"] is None) is voice_available
    assert "test-brain" not in response.text and "test-speech" not in response.text


@pytest.mark.anyio
@pytest.mark.parametrize("preferred", [True, False, None])
async def test_authenticated_bilingual_blaze_catalog(
    preferred: bool | None, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Use the real speech adapter contract and select only catalog voice IDs."""
    app = create_app(
        Settings(
            gemini_api_key=SecretStr("test-brain"),
            blaze_api_key=SecretStr("test-speech"),
        )
    )
    calls: list[str] = []

    async def voices(service: SpeechService, language: str) -> list[SpeechVoice]:
        assert service.settings.blaze_api_key is not None
        calls.append(language)
        if preferred is None:
            return []
        if language == "vi":
            return [
                SpeechVoice(
                    id="HN-Nam-1-BL" if preferred else "vi-other",
                    name="Thầy Mate",
                    language="vi",
                    gender="male",
                )
            ]
        return [SpeechVoice(id="en-voice", name="English", language="en")]

    monkeypatch.setattr(SpeechService, "voices", voices)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        assert (await client.get("/api/voice/voices")).status_code == 401
        assert not calls
        app.dependency_overrides[current_user] = lambda: {"UserId": 1}
        response = await client.get("/api/voice/voices")
    data = response.json()
    assert response.status_code == 200 and data["provider"] == "blaze"
    assert sorted(calls) == ["en", "vi"]
    assert data["default_voice"] == (
        None if preferred is None else "HN-Nam-1-BL" if preferred else "vi-other"
    )
    if preferred is not None:
        assert {voice["language"] for voice in data["voices"]} == {"vi", "en"}
        assert "Kore" not in str(data)
    assert "test-brain" not in response.text and "test-speech" not in response.text


@pytest.mark.anyio
async def test_missing_blaze_key_does_not_fall_back_to_native_voice() -> None:
    """Authenticated callers see a configuration error rather than Gemini voices."""
    app = create_app(Settings(gemini_api_key=SecretStr("test-brain")))
    app.dependency_overrides[current_user] = lambda: {"UserId": 1}
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/voice/voices")
    assert response.status_code == 503
    assert "Blaze" in response.json()["detail"]


@pytest.mark.anyio
async def test_blaze_mode_never_starts_native_signaling(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Keep Gemini GenerateContent but block both native paid voice transports."""
    native = Mock(side_effect=AssertionError("Gemini Live must stay inactive"))
    monkeypatch.setattr("app.main.GeminiVoiceManager", native)
    app = create_app(
        Settings(
            gemini_api_key=SecretStr("test-brain"),
            blaze_api_key=SecretStr("test-speech"),
        )
    )
    assert isinstance(app.state.voice, RealtimeManager)
    assert not isinstance(app.state.voice, GeminiVoiceManager)
    assert isinstance(
        get_llm_client(Request({"type": "http", "app": app})), GeminiLLMClient
    )
    start = AsyncMock()
    monkeypatch.setattr(app.state.voice, "start", start)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        assert (
            await client.post("/api/conversations/1/voice", json={})
        ).status_code == 401
        app.dependency_overrides[current_user] = lambda: {"UserId": 1}
        for offer in ({}, {"sdp": "v=0\r\nlong-offer"}, {"voice_id": "Kore"}):
            response = await client.post("/api/conversations/1/voice", json=offer)
            assert response.status_code == 409
            assert "Blaze" in response.json()["detail"]
    native.assert_not_called()
    start.assert_not_awaited()
    assert not app.state.voice.sessions
    app.state.voice.ensure_text_available(1, 1)
    await app.state.voice.shutdown()


def test_blaze_mode_rejects_native_audio_websocket() -> None:
    """An allowed browser Origin cannot open Gemini Live in Blaze mode."""
    app = create_app(Settings(gemini_api_key=SecretStr("test-brain")))
    with TestClient(app) as client:
        with pytest.raises(WebSocketDisconnect) as error:
            with client.websocket_connect(
                f"/api/voice/{uuid4()}/audio",
                headers={"origin": "http://127.0.0.1:5174"},
            ):
                pass
    assert error.value.code == 4403
