"""Private Gemini Live signaling, audio relay and storage without paid calls."""

import asyncio
import base64
import json
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest
from fastapi import HTTPException, WebSocket
from fastapi.testclient import TestClient
from pydantic import SecretStr
from starlette.websockets import WebSocketDisconnect

from app.core.config import Settings
from app.db.database import Database
from app.llm.gemini_live import GeminiLiveClient
from app.main import create_app
from app.services.gemini_voice import GeminiSession, GeminiVoiceManager
from app.services.realtime import VoiceTurn
from tests.unit.test_realtime import pending

pytestmark = pytest.mark.anyio


def manager() -> GeminiVoiceManager:
    """Use private test settings and disconnected storage, never local .env keys."""
    settings = Settings(gemini_api_key=SecretStr("gemini-test-key"))
    return GeminiVoiceManager(settings, Database(settings))


async def test_live_setup_headers_history_and_audio(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Wait for setupComplete and restore role history before streaming PCM."""
    socket = AsyncMock()
    socket.recv.return_value = json.dumps({"setupComplete": {}})
    connect = AsyncMock(return_value=socket)
    monkeypatch.setattr("app.llm.gemini_live.connect", connect)
    client = manager().live
    assert (
        await client.open(
            "Prompt", [{"role": "assistant", "content": "Previous reply"}]
        )
        is socket
    )
    args = connect.call_args
    assert args.kwargs["additional_headers"] == {"x-goog-api-key": "gemini-test-key"}
    assert "gemini-test-key" not in args.args[0]
    setup = json.loads(socket.send.call_args_list[0].args[0])["setup"]
    assert setup["model"] == "models/gemini-3.8-live"
    speech = setup["generationConfig"]["speechConfig"]
    assert speech["voiceConfig"]["prebuiltVoiceConfig"]["voiceName"] == "Kore"
    assert "languageCode" not in speech
    assert setup["inputAudioTranscription"] == setup["outputAudioTranscription"] == {}
    assert (
        setup["realtimeInputConfig"]["activityHandling"]
        == "START_OF_ACTIVITY_INTERRUPTS"
    )
    assert setup["historyConfig"]["initialHistoryInClientContent"] is True
    assert json.loads(socket.send.call_args_list[1].args[0])["clientContent"] == {
        "turns": [{"role": "model", "parts": [{"text": "Previous reply"}]}],
        "turnComplete": True,
    }
    await client.audio(socket, "AAA=")
    assert (
        json.loads(socket.send.call_args.args[0])["realtimeInput"]["audio"]["mimeType"]
        == "audio/pcm;rate=16000"
    )
    await client.audio(socket, None)
    assert json.loads(socket.send.call_args.args[0]) == {
        "realtimeInput": {"audioStreamEnd": True}
    }
    socket.recv.return_value = '{"error": {"message": "private"}}'
    with pytest.raises(ValueError):
        await client.open("Prompt", [])
    socket.close.assert_awaited_once()
    with pytest.raises(HTTPException):
        GeminiLiveClient(Settings()).headers()


async def test_live_selected_voice_reaches_setup_without_changing_default(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A user's choice changes their upstream setup, never shared configuration."""
    socket = AsyncMock()
    socket.recv.return_value = '{"setupComplete": {}}'
    connect = AsyncMock(return_value=socket)
    monkeypatch.setattr("app.llm.gemini_live.connect", connect)
    client = manager().live
    await client.open("Prompt", [], "Puck")
    setup = json.loads(socket.send.call_args_list[0].args[0])["setup"]
    assert setup["generationConfig"]["speechConfig"]["voiceConfig"] == {
        "prebuiltVoiceConfig": {"voiceName": "Puck"}
    }
    assert client.settings.gemini_voice == "Kore"
    with pytest.raises(HTTPException) as error:
        await client.open("Prompt", [], "Unknown")
    assert error.value.status_code == 422
    assert connect.await_count == 1


async def test_one_use_ticket_owner_limits_and_full_cleanup(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Defer paid calls until attachment; consume owner-bound tickets once."""
    service = manager()
    monkeypatch.setattr(
        service.conversations, "voice_context", lambda *args: ("Prompt", [])
    )
    socket = AsyncMock()

    async def wait() -> str:
        await asyncio.Event().wait()
        return ""

    socket.recv.side_effect = wait
    opened = AsyncMock(return_value=socket)
    monkeypatch.setattr(service.live, "open", opened)
    grant = await service.start(1, 2, voice_id="Aoede")
    session = service.owned(1, grant["session_id"])
    assert isinstance(session, GeminiSession)
    opened.assert_not_called()
    assert "gemini-test-key" not in str(grant)
    with pytest.raises(HTTPException):
        service.owned(2, session.session_id)
    with pytest.raises(HTTPException):
        service.ensure_text_available(1, 2)
    with pytest.raises(HTTPException):
        await service.start(1, 3)
    rejected = AsyncMock()
    await service.attach_browser(session.session_id, "wrong-ticket", rejected)
    rejected.close.assert_awaited_with(code=4404)
    ready = asyncio.Event()
    browser = AsyncMock()
    browser.receive_text.side_effect = wait

    async def sent(event: object) -> None:
        ready.set()

    browser.send_json.side_effect = sent
    attached = asyncio.create_task(
        service.attach_browser(session.session_id, grant["ticket"], browser)
    )
    await asyncio.wait_for(ready.wait(), 2)
    opened.assert_awaited_once_with("Prompt", [], "Aoede")
    assert not session.ticket_hash
    await service.attach_browser(session.session_id, grant["ticket"], rejected)
    assert rejected.close.await_count == 2
    await service.stop(1, session.session_id)
    await attached
    socket.close.assert_awaited_once()
    browser.close.assert_awaited_once()
    assert not service.sessions
    await service.stop(1, session.session_id)


async def test_expired_ticket_and_start_failure_release_slot(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Failed authorization/context and expired tickets never open paid transports."""
    service = manager()

    def failed(*args: object) -> None:
        raise HTTPException(404, "missing")

    monkeypatch.setattr(service.conversations, "voice_context", failed)
    with pytest.raises(HTTPException):
        await service.start(1, 2)
    assert not service.sessions
    session = GeminiSession("expired", 1, 2, started=0)
    service.sessions[session.session_id] = session
    browser = AsyncMock()
    await service.attach_browser("expired", "x" * 43, browser)
    browser.close.assert_awaited_with(code=4404)
    await service.shutdown()


async def test_transcript_chunks_audio_finalize_and_barge_in(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Persist one actual turn, cancel pending and discard interrupted old replies."""
    service = manager()
    prepare = Mock(return_value=pending())
    finalize = Mock(return_value={})
    discard = Mock()
    monkeypatch.setattr(service.conversations, "prepare", prepare)
    monkeypatch.setattr(service.conversations, "finalize", finalize)
    monkeypatch.setattr(service.conversations, "discard_reply", discard)
    browser = AsyncMock()
    session = GeminiSession("session", 1, 2, browser=browser)
    await service.provider_event(
        session, {"serverContent": {"inputTranscription": {"text": "Hi "}}}
    )
    await service.provider_event(
        session, {"serverContent": {"inputTranscription": {"text": "Mate"}}}
    )
    await service.provider_event(
        session,
        {
            "serverContent": {
                "outputTranscription": {"text": "Hello!"},
                "modelTurn": {
                    "parts": [
                        {
                            "inlineData": {
                                "mimeType": "audio/pcm;rate=24000",
                                "data": "AAAAAA==",
                            }
                        }
                    ]
                },
            }
        },
    )
    await service.provider_event(session, {"serverContent": {"turnComplete": True}})
    assert prepare.call_args.args[2].message == "Hi Mate"
    assert finalize.call_args.args[2:4] == ("completed", "Hello!")
    assert browser.send_json.call_args.args[0] == {"type": "done"}
    await service.provider_event(
        session,
        {
            "serverContent": {
                "interrupted": True,
                "turnComplete": True,
                "inputTranscription": {"text": "New question"},
            }
        },
    )
    discard.assert_called_once()
    assert session.current and session.current.transcript == "New question"
    await service.cleanup(session)
    assert finalize.call_args.args[2] == "cancelled"
    assert not service.sessions


@pytest.mark.parametrize(
    "content",
    [
        {"outputTranscription": {"text": "answer"}, "turnComplete": True},
        {"inputTranscription": {"text": "x" * 2001}},
        {"outputTranscription": {"text": "x" * 12001}},
        {"inputTranscription": {"text": 3}},
        {
            "modelTurn": {
                "parts": [{"inlineData": {"mimeType": "audio/mp3", "data": "AAA="}}]
            }
        },
        {
            "modelTurn": {
                "parts": [
                    {"inlineData": {"mimeType": "audio/pcm;rate=24000", "data": "bad"}}
                ]
            }
        },
    ],
)
async def test_invalid_provider_content_fails_closed(
    content: dict[str, object],
) -> None:
    """Missing/oversized transcripts and invalid audio never become stored successes."""
    service = manager()
    session = GeminiSession("session", 1, 2, browser=AsyncMock())
    with pytest.raises(ValueError):
        await service.provider_event(session, {"serverContent": content})


@pytest.mark.parametrize(
    "payload",
    [
        {"assistant": "forged"},
        {"audio": "bad"},
        {"audio": "AA=="},
        {"audio": base64.b64encode(b"x" * 8194).decode()},
        {"audio": 4},
    ],
)
async def test_audio_relay_rejects_arbitrary_or_oversized_messages(
    payload: object,
) -> None:
    """Browser clients cannot send prompts or forge provider transcripts."""
    service = manager()
    browser = AsyncMock()
    browser.receive_text.return_value = json.dumps(payload)
    session = GeminiSession("session", 1, 2, browser=browser, socket=AsyncMock())
    with pytest.raises(ValueError):
        await service.receive_audio(session)


async def test_audio_relay_and_lease(monkeypatch: pytest.MonkeyPatch) -> None:
    """Forward only PCM/end, and stop idle sessions even with no provider traffic."""
    service = manager()
    browser = AsyncMock()
    browser.receive_text.side_effect = [
        '{"audio":"AAAAAA=="}',
        '{"audio_end":true}',
        WebSocketDisconnect(),
    ]
    socket = AsyncMock()
    session = GeminiSession("session", 1, 2, browser=browser, socket=socket)
    with pytest.raises(WebSocketDisconnect):
        await service.receive_audio(session)
    assert socket.send.await_count == 2
    session.heartbeat = 0
    await service.receive_provider(session)
    socket.recv.assert_not_called()
    session.turns["pending"] = VoiceTurn("pending", transcript="Hi")
    monkeypatch.setattr(
        service.conversations,
        "prepare",
        Mock(side_effect=RuntimeError("DB unavailable")),
    )
    service.sessions["session"] = session
    await service.cleanup(session)
    socket.close.assert_awaited_once()
    assert not service.sessions and session.error


async def test_provider_connection_failure_cleans_both_ends(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A rejected Live setup closes the browser and releases capacity immediately."""
    service = manager()
    browser = AsyncMock()
    session = GeminiSession("session", 1, 2, browser=browser)
    session.attached.set()
    service.sessions[session.session_id] = session
    monkeypatch.setattr(
        service.live, "open", AsyncMock(side_effect=ValueError("private"))
    )
    await service.monitor(session)
    assert session.error and not service.sessions
    assert browser.send_json.call_args.args[0]["type"] == "error"
    browser.close.assert_awaited_once()


async def test_failed_provider_close_is_reported_and_releases_capacity() -> None:
    """A failing close must not return successful cleanup or leak the browser slot."""
    service = manager()
    browser = AsyncMock()
    socket = AsyncMock()
    socket.close.side_effect = RuntimeError("transport closed unexpectedly")
    session = GeminiSession("session", 1, 2, browser=browser, socket=socket)
    service.sessions[session.session_id] = session
    with pytest.raises(HTTPException) as error:
        await service.stop(1, session.session_id)
    assert error.value.status_code == 502
    assert session.error and not service.sessions
    browser.close.assert_awaited_once()


def test_websocket_origin_ticket_shape_and_rest_auth(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Only allowed origins and short-lived tickets reach the owned audio relay."""
    app = create_app(Settings(gemini_api_key=SecretStr("gemini-test-key")))

    async def close_browser(identity: str, ticket: str, browser: WebSocket) -> None:
        await browser.close()

    attach = AsyncMock(side_effect=close_browser)
    monkeypatch.setattr(app.state.voice, "attach_browser", attach)
    path = f"/api/voice/{uuid4()}/audio"
    with TestClient(app) as client:
        assert client.get("/api/voice/voices").status_code == 401
        assert client.post("/api/conversations/1/voice", json={}).status_code == 401
        with pytest.raises(WebSocketDisconnect) as error:
            with client.websocket_connect(
                path, headers={"origin": "https://untrusted.invalid"}
            ):
                pass
        assert error.value.code == 4403
        with client.websocket_connect(
            path, headers={"origin": "http://127.0.0.1:5174"}
        ) as ws:
            ws.send_json({"ticket": "x"})
            with pytest.raises(WebSocketDisconnect) as error:
                ws.receive_json()
            assert error.value.code == 4401
        with client.websocket_connect(
            path, headers={"origin": "http://127.0.0.1:5174"}
        ) as ws:
            ws.send_json({"ticket": "x" * 43})
            assert ws.receive()["type"] == "websocket.close"
        attach.assert_awaited_once()
