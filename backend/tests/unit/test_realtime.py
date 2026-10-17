"""Exercise signaling, turn identity, barge-in and cleanup without paid calls."""

import asyncio
import json
from time import monotonic
from unittest.mock import AsyncMock, Mock

import httpx
import pytest
from fastapi import HTTPException
from pydantic import SecretStr

from app.core.config import Settings
from app.db.database import Database
from app.services.conversations import PendingTurn
from app.services.realtime import RealtimeManager, VoiceSession, VoiceTurn

pytestmark = pytest.mark.anyio


def manager() -> RealtimeManager:
    """Use disconnected persistence doubles; integration tests cover actual MySQL."""
    settings = Settings(
        llm_provider="openai", openai_api_key=SecretStr("unit-test-key")
    )
    result = RealtimeManager(settings, Database(settings))
    return result


def pending() -> PendingTurn:
    """Return a detached reservation with no user/provider secrets."""
    return PendingTurn(
        {"MessageId": 1}, {"MessageId": 2}, {"EvaluationId": 3}, "Prompt", "A2", []
    )


async def test_signaling_seeded_history_ownership_and_end(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Use multipart SDP, private auth and trusted role history before opening media."""
    service = manager()
    monkeypatch.setattr(
        service.conversations,
        "voice_context",
        lambda uid, cid: (
            "Prompt",
            [
                {"role": "user", "content": "My color is red"},
                {"role": "assistant", "content": "Got it"},
            ],
        ),
    )
    original = httpx.AsyncClient
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.url.path.endswith("hangup"):
            return httpx.Response(204)
        assert b'"type": "server_vad"' in request.content
        assert b'"interrupt_response": true' in request.content
        assert request.headers["Authorization"] == "Bearer unit-test-key"
        return httpx.Response(
            201,
            text="v=0\r\nanswer",
            headers={"Location": "/v1/realtime/calls/rtc_test"},
        )

    monkeypatch.setattr(
        "app.llm.realtime.httpx.AsyncClient",
        lambda **kwargs: original(transport=httpx.MockTransport(handler)),
    )

    async def wait() -> str:
        await asyncio.Event().wait()
        return ""

    socket = AsyncMock()
    socket.recv.side_effect = wait
    monkeypatch.setattr("app.llm.realtime.connect", AsyncMock(return_value=socket))
    answer = await service.start(1, 2, "v=0\r\noffer")
    identity = answer["session_id"]
    session = service.owned(1, identity)
    assert answer["sdp"] == "v=0\r\nanswer"
    assert "unit-test-key" not in str(answer)
    assert [
        json.loads(call.args[0])["item"]["role"] for call in socket.send.call_args_list
    ] == ["user", "assistant"]
    with pytest.raises(HTTPException) as error:
        service.owned(2, identity)
    assert error.value.status_code == 404
    with pytest.raises(HTTPException):
        service.ensure_text_available(1, 2)
    with pytest.raises(HTTPException):
        await service.start(1, 3, "v=0\r\noffer")
    service.ensure_text_available(1, 3)
    await asyncio.sleep(0)
    await service.stop(1, identity)
    assert session.state == "closed" and not service.sessions
    socket.close.assert_awaited_once()
    assert requests[-1].url.path.endswith("rtc_test/hangup")
    await service.stop(1, identity)


@pytest.mark.parametrize("status", [401, 429, 500])
async def test_signaling_errors_are_not_fake_success(
    status: int, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Provider/auth failure releases the reserved slot without manufacturing SDP."""
    service = manager()
    monkeypatch.setattr(
        service.conversations, "voice_context", lambda *args: ("Prompt", [])
    )
    original = httpx.AsyncClient
    monkeypatch.setattr(
        "app.llm.realtime.httpx.AsyncClient",
        lambda **kwargs: original(
            transport=httpx.MockTransport(lambda request: httpx.Response(status))
        ),
    )
    with pytest.raises(HTTPException):
        await service.start(1, 2, "v=0\r\noffer")
    assert not service.sessions


async def test_late_transcript_duplicate_done_and_interruption(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Provider event reordering must not duplicate turns or revive cancelled speech."""
    service = manager()
    prepare = Mock(return_value=pending())
    finalize = Mock(return_value={})
    discard = Mock()
    monkeypatch.setattr(service.conversations, "prepare", prepare)
    monkeypatch.setattr(service.conversations, "finalize", finalize)
    monkeypatch.setattr(service.conversations, "discard_reply", discard)
    session = VoiceSession("test-session", 1, 2)
    await service.event(
        session, {"type": "input_audio_buffer.committed", "item_id": "input1"}
    )
    await service.event(
        session, {"type": "response.created", "response": {"id": "response1"}}
    )
    done = {
        "type": "response.done",
        "response": {
            "id": "response1",
            "status": "completed",
            "output": [
                {"id": "output1", "content": [{"transcript": "A generated answer"}]}
            ],
        },
    }
    await service.event(session, done)
    prepare.assert_not_called()
    await service.event(
        session,
        {
            "type": "conversation.item.input_audio_transcription.completed",
            "item_id": "input1",
            "transcript": "Hello",
        },
    )
    await service.event(session, done)
    assert prepare.call_count == finalize.call_count == 1
    assert finalize.call_args.args[2:4] == ("completed", "A generated answer")
    await service.event(
        session, {"type": "conversation.item.truncated", "item_id": "output1"}
    )
    discard.assert_called_once()
    await service.event(
        session, {"type": "input_audio_buffer.committed", "item_id": "input2"}
    )
    await service.event(
        session, {"type": "response.created", "response": {"id": "response2"}}
    )
    await service.event(
        session,
        {
            "type": "response.output_item.added",
            "response_id": "response2",
            "item": {"id": "output2"},
        },
    )
    await service.event(
        session,
        {
            "type": "conversation.item.input_audio_transcription.completed",
            "item_id": "input2",
            "transcript": "Wait, explain that",
        },
    )
    await service.event(session, {"type": "input_audio_buffer.speech_started"})
    assert session.state == "user_speaking"
    assert finalize.call_args.args[2:4] == ("cancelled", None)
    count = finalize.call_count
    await service.event(
        session,
        {
            "type": "response.done",
            "response": {
                "id": "response2",
                "status": "completed",
                "output": [{"content": [{"text": "LATE"}]}],
            },
        },
    )
    assert finalize.call_count == count


async def test_invalid_events_and_cleanup_pending(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """End/disconnect finalizes pending reservations and frees transport resources."""
    service = manager()
    session = VoiceSession("session", 1, 2)
    service.sessions[session.session_id] = session
    session.socket = AsyncMock()
    turn = VoiceTurn("input", transcript="Hello", stored=pending())
    session.turns["input"] = turn
    finalize = Mock(return_value={})
    monkeypatch.setattr(service.conversations, "finalize", finalize)
    await service.cleanup(session)
    assert not service.sessions and turn.finalized
    assert finalize.call_args.args[2] == "cancelled"
    for kind in ("error", "conversation.item.input_audio_transcription.failed"):
        with pytest.raises(ValueError):
            await service.event(session, {"type": kind})
    with pytest.raises(ValueError):
        await service.event(
            session,
            {
                "type": "conversation.item.input_audio_transcription.completed",
                "item_id": "bad",
                "transcript": 123,
            },
        )
    await service.cleanup(session)


async def test_monitor_expires_without_heartbeat_and_missing_credentials() -> None:
    """Lost browsers cannot leave billable sessions running indefinitely."""
    service = manager()
    session = VoiceSession("expired", 1, 2, heartbeat=monotonic() - 36)
    session.socket = AsyncMock()
    service.sessions[session.session_id] = session
    await service.monitor(session)
    assert not service.sessions
    service.settings.openai_api_key = None
    with pytest.raises(HTTPException) as error:
        service.headers()
    assert error.value.status_code == 503


async def test_database_failure_does_not_prevent_provider_cleanup(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A DB outage at End Voice must still terminate the paid upstream call."""
    service = manager()
    session = VoiceSession("session", 1, 2, call_id="rtc_test")
    session.turns["input"] = VoiceTurn("input", transcript="Hello", stored=pending())
    service.sessions[session.session_id] = session
    monkeypatch.setattr(
        service.conversations,
        "finalize",
        Mock(side_effect=RuntimeError("database down")),
    )
    hangup = AsyncMock(return_value=True)
    monkeypatch.setattr(service.provider, "hangup", hangup)
    with pytest.raises(HTTPException):
        await service.stop(1, session.session_id)
    hangup.assert_awaited_once_with("rtc_test")
    assert not service.sessions
