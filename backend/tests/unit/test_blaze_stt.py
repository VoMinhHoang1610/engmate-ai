"""Offline STT relay contracts, authorization gates and bounded cancellation."""

import asyncio
import json
from unittest.mock import AsyncMock, Mock

import httpx
import pytest
from fastapi import HTTPException, WebSocket
from fastapi.testclient import TestClient
from pydantic import SecretStr
from websockets.asyncio.client import ClientConnection

from app.api.chat_routes import auth_service, conversation_service, current_user
from app.core.config import Settings
from app.main import create_app
from app.services.blaze_stt import (
    FRAME_BYTES,
    BlazeSTTManager,
    STTError,
    provider_event,
)


def settings() -> Settings:
    """Use isolated credentials and explicitly enable the experimental transport."""
    return Settings(
        blaze_api_key=SecretStr("private-test-key"), blaze_stt_mode="realtime"
    )


@pytest.mark.anyio
async def test_tickets_expire_are_bounded_and_logout_revokes() -> None:
    """Do not open an upstream socket just to authorize a turn."""
    manager = BlazeSTTManager(settings())
    first = manager.issue(1, "en")
    manager.issue(1, "vi")
    with pytest.raises(HTTPException) as limited:
        manager.issue(1, "en")
    assert limited.value.status_code == 429
    manager.leases[first["session_id"]].created -= 11
    manager.issue(1, "en")
    assert first["session_id"] not in manager.leases
    other = manager.issue(2, "en")
    await manager.shutdown(1)
    assert list(manager.leases) == [other["session_id"]]
    await manager.shutdown()
    assert not manager.leases


@pytest.mark.anyio
@pytest.mark.parametrize("invalid", ["wrong", "expired", "used"])
async def test_invalid_tickets_never_open_provider(
    invalid: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A ticket cannot be replayed or used after its attach window."""
    manager = BlazeSTTManager(settings())
    provider = AsyncMock()
    monkeypatch.setattr(manager, "open_provider", provider)
    ticket = manager.issue(1, "en")
    lease = manager.leases[ticket["session_id"]]
    if invalid == "expired":
        lease.created -= 11
    if invalid == "used":
        lease.digest = b""
    browser = AsyncMock(spec=WebSocket)
    await manager.relay(
        ticket["session_id"], "bad" if invalid == "wrong" else ticket["ticket"], browser
    )
    provider.assert_not_called()
    browser.close.assert_awaited_once_with(code=4401)


@pytest.mark.anyio
async def test_pcm_forwarded_without_envelope_or_transcript_injection() -> None:
    """Only exactly sized PCM frames reach Blaze."""
    browser, socket = AsyncMock(spec=WebSocket), AsyncMock(spec=ClientConnection)
    pcm = b"\0" * FRAME_BYTES
    browser.receive.side_effect = [
        {"type": "websocket.receive", "bytes": pcm},
        {"type": "websocket.disconnect"},
    ]
    await BlazeSTTManager.receive_audio(browser, socket)
    socket.send.assert_awaited_once_with(pcm)
    for message in (
        {"type": "websocket.receive", "text": '{"text":"injected"}'},
        {"type": "websocket.receive", "bytes": b"bad"},
    ):
        browser.receive.side_effect = [message]
        with pytest.raises(ValueError):
            await BlazeSTTManager.receive_audio(browser, socket)


@pytest.mark.anyio
async def test_audio_rate_and_total_duration_are_bounded() -> None:
    """Do not let authenticated clients send unbounded billable audio."""
    browser, socket = AsyncMock(spec=WebSocket), AsyncMock(spec=ClientConnection)
    browser.receive.return_value = {
        "type": "websocket.receive",
        "bytes": b"\0" * FRAME_BYTES,
    }
    with pytest.raises(STTError) as limited:
        await BlazeSTTManager.receive_audio(browser, socket)
    assert limited.value.code == "audio_limit"
    assert socket.send.await_count <= 51


@pytest.mark.anyio
async def test_total_audio_frames_are_bounded_even_at_a_slow_send_rate(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The hard audio cap is independent of token-bucket burst protection."""
    times = iter(range(1000))
    monkeypatch.setattr("app.services.blaze_stt.monotonic", lambda: next(times))
    browser, socket = AsyncMock(spec=WebSocket), AsyncMock(spec=ClientConnection)
    browser.receive.return_value = {
        "type": "websocket.receive",
        "bytes": b"\0" * FRAME_BYTES,
    }
    with pytest.raises(ValueError):
        await BlazeSTTManager.receive_audio(browser, socket)
    assert socket.send.await_count == 350


@pytest.mark.anyio
async def test_global_ticket_limit_and_disabled_mode() -> None:
    """Unattached tickets remain bounded and batch mode cannot spend realtime credit."""
    manager = BlazeSTTManager(settings())
    for user_id in range(32):
        manager.issue(user_id, "en")
    with pytest.raises(HTTPException) as limited:
        manager.issue(100, "en")
    assert limited.value.status_code == 429
    for config in (Settings(), Settings(blaze_api_key=SecretStr("key"))):
        with pytest.raises(HTTPException) as disabled:
            BlazeSTTManager(config).issue(1, "en")
        assert disabled.value.status_code == 503


@pytest.mark.anyio
async def test_rest_logout_revokes_only_the_owning_accounts_stt_tickets() -> None:
    """The existing logout route must also revoke realtime speech resources."""
    app = create_app(settings())
    app.dependency_overrides[current_user] = lambda: {"UserId": 1}
    service = Mock()
    app.dependency_overrides[auth_service] = lambda: service
    manager = app.state.blaze_stt
    first = manager.issue(1, "vi")
    second = manager.issue(2, "vi")
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        assert (await client.post("/api/auth/logout")).status_code == 204
    assert first["session_id"] not in manager.leases
    assert second["session_id"] in manager.leases


@pytest.mark.anyio
async def test_only_known_provider_text_is_exposed() -> None:
    """Strip all extra provider fields and fail closed on errors or oversized text."""
    browser, socket = AsyncMock(spec=WebSocket), AsyncMock(spec=ClientConnection)
    socket.recv.side_effect = [
        json.dumps({"type": "partial", "text": "hi", "token": "private"}),
        json.dumps({"type": "final", "text": "Hi."}),
        json.dumps({"type": "error", "text": "secret"}),
    ]
    with pytest.raises(ValueError):
        await BlazeSTTManager.receive_text(browser, socket)
    assert browser.send_json.await_args_list[0].args == (
        {"type": "partial", "text": "hi"},
    )
    assert browser.send_json.await_args_list[1].args == (
        {"type": "final", "text": "Hi."},
    )
    assert browser.send_json.await_count == 2
    socket.recv.side_effect = [json.dumps({"type": "final", "text": "x" * 2001})]
    with pytest.raises(ValueError):
        await BlazeSTTManager.receive_text(browser, socket)


@pytest.mark.anyio
@pytest.mark.parametrize("logout", [False, True])
async def test_disconnect_and_logout_close_provider_and_cancel_sibling_tasks(
    logout: bool,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Pending recv must not survive its browser or the account logout."""
    manager = BlazeSTTManager(settings())
    ticket = manager.issue(1, "vi")
    browser, socket = AsyncMock(spec=WebSocket), AsyncMock(spec=ClientConnection)
    attached = asyncio.Event()

    async def receive() -> dict[str, str]:
        attached.set()
        if logout:
            await asyncio.Event().wait()
        return {"type": "websocket.disconnect"}

    async def recv() -> str:
        await asyncio.Event().wait()
        return ""

    browser.receive.side_effect = receive
    socket.recv.side_effect = recv
    monkeypatch.setattr(manager, "open_provider", AsyncMock(return_value=socket))
    task = asyncio.create_task(
        manager.relay(ticket["session_id"], ticket["ticket"], browser)
    )
    await attached.wait()
    if logout:
        await manager.shutdown(1)
    await asyncio.gather(task, return_exceptions=True)
    assert not manager.leases
    socket.close.assert_awaited_once()
    browser.close.assert_awaited_once()


@pytest.mark.anyio
async def test_provider_init_has_correct_model_and_server_only_token(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Use the published ready/init contract, never a guessed end/flush command."""
    socket = AsyncMock(spec=ClientConnection)
    socket.recv.return_value = '{"type":"ready"}'
    connect = AsyncMock(return_value=socket)
    monkeypatch.setattr("app.services.blaze_stt.connect", connect)
    manager = BlazeSTTManager(settings())
    assert await manager.open_provider("en") is socket
    payload = json.loads(socket.send.await_args.args[0])
    assert payload == {
        "token": "private-test-key",
        "language": "en",
        "model": "stt-stream-1.5",
    }
    socket.recv.return_value = '{"type":"error", "text":"private error"}'
    with pytest.raises(ValueError):
        await manager.open_provider("en")
    socket.close.assert_awaited_once()


@pytest.mark.anyio
async def test_disconnect_during_setup_cancels_upstream_handshake(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """An abandoned turn must not keep a slow provider handshake alive."""
    manager = BlazeSTTManager(settings())
    ticket = manager.issue(1, "vi")
    started, cancelled = asyncio.Event(), asyncio.Event()

    async def open_provider(language: str) -> ClientConnection:
        started.set()
        try:
            await asyncio.Event().wait()
        finally:
            cancelled.set()
        raise AssertionError("Unreachable")

    browser = AsyncMock(spec=WebSocket)

    async def disconnected() -> dict[str, str]:
        await started.wait()
        return {"type": "websocket.disconnect"}

    browser.receive.side_effect = disconnected
    monkeypatch.setattr(manager, "open_provider", open_provider)
    await asyncio.wait_for(
        manager.relay(ticket["session_id"], ticket["ticket"], browser), 1
    )
    assert cancelled.is_set()
    assert not manager.leases
    browser.send_json.assert_not_called()


@pytest.mark.anyio
async def test_ticket_route_requires_auth_owned_open_conversation_and_mode() -> None:
    """Authorization/ownership failures cannot reserve tickets or spend credit."""
    app = create_app(settings())
    service = Mock()
    service.detail.return_value = {"status": "in_progress"}
    app.dependency_overrides[conversation_service] = lambda: service
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        path = "/api/conversations/7/speech-ticket?language=en"
        assert (await client.post(path)).status_code == 401
        service.detail.assert_not_called()
        app.dependency_overrides[current_user] = lambda: {"UserId": 1}
        service.detail.side_effect = HTTPException(404, "Not found")
        assert (await client.post(path)).status_code == 404
        service.detail.side_effect = None
        service.detail.return_value = {"status": "completed"}
        assert (await client.post(path)).status_code == 409
        service.detail.return_value = {"status": "in_progress"}
        assert (
            await client.post(path, headers={"Origin": "https://evil.test"})
        ).status_code == 403
        assert (await client.post(path.replace("en", "xx"))).status_code == 422
        result = await client.post(path)
        assert result.status_code == 200
        assert "private-test-key" not in result.text
        service.detail.assert_called_with(1, 7)


def test_websocket_rejects_wrong_origin_and_replayed_ticket_before_provider() -> None:
    """Verify the actual websocket route as well as the manager's auth gate."""
    app = create_app(settings())
    manager = app.state.blaze_stt
    manager.open_provider = AsyncMock(side_effect=ValueError("private provider error"))
    lease = manager.issue(1, "en")
    path = f"/api/speech/realtime/{lease['session_id']}"
    with TestClient(app) as client:
        from starlette.websockets import WebSocketDisconnect

        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect(
                path, headers={"Origin": "https://evil.test"}
            ):
                pass
        manager.open_provider.assert_not_called()
        with client.websocket_connect(
            path, headers={"Origin": "http://localhost:5174"}
        ) as ws:
            ws.send_bytes(b"not a ticket")
            with pytest.raises(WebSocketDisconnect):
                ws.receive_json()
        manager.open_provider.assert_not_called()
        with client.websocket_connect(
            path, headers={"Origin": "http://localhost:5174"}
        ) as ws:
            ws.send_json({"ticket": lease["ticket"]})
            error = ws.receive_json()
            assert error["type"] == "error" and "private" not in str(error)
        with client.websocket_connect(
            path, headers={"Origin": "http://localhost:5174"}
        ) as ws:
            ws.send_json({"ticket": lease["ticket"]})
            with pytest.raises(WebSocketDisconnect):
                ws.receive_json()
        manager.open_provider.assert_awaited_once()


def test_websocket_ready_pcm_and_final_roundtrip(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Exercise real route framing and relay task ownership without a paid provider."""
    app = create_app(settings())
    manager = app.state.blaze_stt
    lease = manager.issue(1, "en")
    socket = AsyncMock(spec=ClientConnection)
    responses: asyncio.Queue[str] = asyncio.Queue()

    async def audio(pcm: str | bytes) -> None:
        if isinstance(pcm, str):
            assert json.loads(pcm)["model"] == "stt-stream-1.5"
            await responses.put('{"type":"successful-authentication"}')
            await responses.put('{"type":"ready"}')
            return
        assert len(pcm) == FRAME_BYTES
        await responses.put(json.dumps({"type": "partial", "text": "Hi"}))
        await responses.put(json.dumps({"type": "final", "text": "Hi there."}))

    socket.send.side_effect = audio
    socket.recv.side_effect = responses.get
    monkeypatch.setattr(
        "app.services.blaze_stt.connect", AsyncMock(return_value=socket)
    )
    with TestClient(app) as client:
        with client.websocket_connect(
            f"/api/speech/realtime/{lease['session_id']}",
            headers={"Origin": "http://localhost:5174"},
        ) as ws:
            ws.send_json({"ticket": lease["ticket"]})
            assert ws.receive_json() == {"type": "ready"}
            ws.send_bytes(b"\0" * FRAME_BYTES)
            assert ws.receive_json() == {"type": "partial", "text": "Hi"}
            assert ws.receive_json() == {"type": "final", "text": "Hi there."}
    socket.close.assert_awaited_once()
    assert not manager.leases


@pytest.mark.anyio
async def test_authentication_ack_waits_for_ready_before_opening_provider(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Replay the observed Blaze handshake without treating authentication as ready."""
    manager = BlazeSTTManager(settings())
    socket = AsyncMock(spec=ClientConnection)
    waiting = asyncio.Event()
    ready = asyncio.Event()
    frames = 0

    async def recv() -> str:
        nonlocal frames
        frames += 1
        if frames == 1:
            return '{"type":"successful-authentication","message":"PRIVATE"}'
        waiting.set()
        await ready.wait()
        return '{"type":"ready","text":"PRIVATE"}'

    socket.recv.side_effect = recv
    monkeypatch.setattr(
        "app.services.blaze_stt.connect", AsyncMock(return_value=socket)
    )
    opening = asyncio.create_task(manager.open_provider("vi"))
    try:
        await asyncio.wait_for(waiting.wait(), 1)
        assert not opening.done()
        # Only the init frame is sent, never PCM or a speculative second command.
        socket.send.assert_awaited_once()
        assert isinstance(socket.send.await_args.args[0], str)
        ready.set()
        assert await asyncio.wait_for(opening, 1) is socket
        socket.close.assert_not_called()
    finally:
        opening.cancel()
        await asyncio.gather(opening, return_exceptions=True)


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("next_frame", "code"),
    [
        ('{"type":"successful-authentication"}', "protocol_error"),
        ('{"type":"partial","text":"not final"}', "protocol_error"),
        ('{"type":"unknown"}', "protocol_error"),
        ('{"type":"insufficient-credits"}', "insufficient_credits"),
        ('{"type":"error","text":"PRIVATE"}', "provider_error"),
        ("malformed", "protocol_error"),
    ],
)
async def test_authentication_ack_does_not_bypass_setup_validation(
    next_frame: str, code: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Only ready can follow the optional ack; retain errors and bounded cleanup."""
    socket = AsyncMock(spec=ClientConnection)
    socket.recv.side_effect = ['{"type":"successful-authentication"}', next_frame]
    monkeypatch.setattr(
        "app.services.blaze_stt.connect", AsyncMock(return_value=socket)
    )
    with pytest.raises(STTError) as error:
        await BlazeSTTManager(settings()).open_provider("vi")
    assert error.value.code == code
    socket.send.assert_awaited_once()
    socket.close.assert_awaited_once()


@pytest.mark.anyio
@pytest.mark.parametrize("cancel", [False, True])
async def test_authentication_ack_wait_cleanup_on_timeout_or_cancel(
    cancel: bool, monkeypatch: pytest.MonkeyPatch
) -> None:
    """An authenticated socket is still closed if ready never arrives."""
    socket = AsyncMock(spec=ClientConnection)
    socket.recv.side_effect = [
        '{"type":"successful-authentication"}',
        asyncio.CancelledError() if cancel else TimeoutError(),
    ]
    monkeypatch.setattr(
        "app.services.blaze_stt.connect", AsyncMock(return_value=socket)
    )
    with pytest.raises(asyncio.CancelledError if cancel else TimeoutError):
        await BlazeSTTManager(settings()).open_provider("vi")
    socket.close.assert_awaited_once()


@pytest.mark.parametrize(
    ("kind", "code"),
    [
        ("insufficient-credits", "insufficient_credits"),
        ("invoice-not-paid", "invoice_not_paid"),
        ("subscription-not-found", "subscription_missing"),
        ("plan-upgrade-required", "plan_upgrade_required"),
        ("error", "provider_error"),
        ("undocumented-PRIVATE-event", "protocol_error"),
    ],
)
@pytest.mark.parametrize("phase", ["setup", "stream"])
def test_provider_errors_are_classified_through_real_route_without_payload_leaks(
    kind: str,
    code: str,
    phase: str,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Keep init/stream failure causes without treating them as bad transcripts."""
    app = create_app(settings())
    manager = app.state.blaze_stt
    lease = manager.issue(1, "vi")
    socket = AsyncMock(spec=ClientConnection)
    error = json.dumps(
        {"type": kind, "text": "PRIVATE-TRANSCRIPT", "message": "PRIVATE-TOKEN"}
    )
    socket.recv.side_effect = (
        [error] if phase == "setup" else ['{"type":"ready"}', error]
    )
    monkeypatch.setattr(
        "app.services.blaze_stt.connect", AsyncMock(return_value=socket)
    )
    with TestClient(app) as client:
        with client.websocket_connect(
            f"/api/speech/realtime/{lease['session_id']}",
            headers={"Origin": "http://localhost:5174"},
        ) as ws:
            ws.send_json({"ticket": lease["ticket"]})
            if phase == "stream":
                assert ws.receive_json() == {"type": "ready"}
            failure = ws.receive_json()
            assert failure["type"] == "error"
            assert failure["code"] == code and failure["phase"] == phase
            assert "PRIVATE" not in json.dumps(failure)
    assert f"code={code} phase={phase}" in caplog.text
    if code == "protocol_error":
        reason = "expected_ready" if phase == "setup" else "unexpected_stream_event"
        assert f"reason={reason} exception=STTError" in caplog.text
    assert "PRIVATE" not in caplog.text and "private-test-key" not in caplog.text
    socket.close.assert_awaited_once()
    assert not manager.leases


@pytest.mark.parametrize(
    "raw", ["[]", "{bad", '{"type":[]}', '{"type":"final"' + " " * 16384]
)
def test_invalid_provider_envelopes_have_safe_protocol_code(raw: str) -> None:
    """Malformed frames never escape as untyped exceptions or raw log content."""
    with pytest.raises(STTError) as failure:
        provider_event(raw)
    assert failure.value.code == "protocol_error"


def test_documented_auth_failure_is_distinct_from_arbitrary_provider_text() -> None:
    """Recognize only the documented auth sentinel, never reflect a raw message."""
    with pytest.raises(STTError) as auth:
        provider_event('{"type":"error","text":"Authentication failed"}')
    assert auth.value.code == "provider_auth"
    with pytest.raises(STTError) as other:
        provider_event('{"type":"error","text":"Authentication failed: PRIVATE"}')
    assert other.value.code == "provider_error" and "PRIVATE" not in str(other.value)


@pytest.mark.anyio
async def test_local_setup_exception_logs_only_allowlisted_class(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    """Distinguish local setup bugs from invalid provider events without raw errors."""
    manager = BlazeSTTManager(settings())
    ticket = manager.issue(1, "en")
    browser = AsyncMock(spec=WebSocket)

    async def wait_for_disconnect() -> dict[str, str]:
        await asyncio.Event().wait()
        raise AssertionError("Unreachable")

    browser.receive.side_effect = wait_for_disconnect
    monkeypatch.setattr(
        manager, "open_provider", AsyncMock(side_effect=TypeError("PRIVATE-TOKEN"))
    )
    await manager.relay(ticket["session_id"], ticket["ticket"], browser)
    assert "reason=unspecified exception=TypeError" in caplog.text
    assert "PRIVATE" not in caplog.text
    failure = browser.send_json.await_args.args[0]
    assert failure["code"] == "protocol_error" and failure["phase"] == "setup"
    assert "PRIVATE" not in json.dumps(failure)
    browser.close.assert_awaited_once()
    assert not manager.leases
