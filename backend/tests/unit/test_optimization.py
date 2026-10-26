"""Offline provider admission, catalog reuse and configuration regressions."""

import asyncio
from collections.abc import AsyncIterator
from pathlib import Path
from uuid import uuid4

import httpx
import pytest
from fastapi import HTTPException
from pydantic import SecretStr
from starlette.requests import Request

from app.api.chat_routes import conversation_service, current_user
from app.api.dependencies import get_llm_client
from app.api.speech_routes import connected_job, speech_service
from app.core.admission import Admission
from app.core.config import Settings
from app.main import create_app
from app.services.speech import SpeechService, VoiceCatalogCache


@pytest.mark.anyio
async def test_admission_rejects_overload_and_releases_on_cancellation() -> None:
    """Overloaded owners cannot consume other users' slots or leak reservations."""
    gate = Admission(2, 1)
    async with gate.slot(1):
        with pytest.raises(HTTPException) as blocked:
            async with gate.slot(1):
                pytest.fail("Admitted over account quota")
        assert blocked.value.status_code == 429
        assert blocked.value.headers == {"Retry-After": "2"}
        async with gate.slot(2):
            with pytest.raises(HTTPException):
                async with gate.slot(3):
                    pytest.fail("Admitted over process quota")
    entered = asyncio.Event()

    async def job() -> None:
        async with gate.slot(1):
            entered.set()
            await asyncio.Event().wait()

    task = asyncio.create_task(job())
    await entered.wait()
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    assert gate.active == 0 and not gate.users


@pytest.mark.anyio
async def test_speech_route_limits_whole_jobs_before_paid_call() -> None:
    """The HTTP route holds a slot across provider wait and allows recovery."""
    app = create_app(Settings(speech_max_jobs=1, speech_max_jobs_per_user=1))
    entered, finish = asyncio.Event(), asyncio.Event()
    calls = 0

    class Speech:
        async def synthesize(self, data: object) -> bytes:
            nonlocal calls
            calls += 1
            entered.set()
            await finish.wait()
            return b"mp3"

    app.dependency_overrides[speech_service] = Speech
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        pending = asyncio.create_task(
            client.post("/api/speech/tts", json={"text": "hello"})
        )
        await entered.wait()
        blocked = await client.post("/api/speech/tts", json={"text": "other"})
        assert blocked.status_code == 429 and calls == 1
        finish.set()
        assert (await pending).status_code == 200
        assert (
            await client.post("/api/speech/tts", json={"text": "next"})
        ).status_code == 200
    assert app.state.speech_admission.active == 0


@pytest.mark.anyio
async def test_disconnect_cancels_provider_work_and_releases_slot() -> None:
    """A disconnect interrupts stalled upstream work and returns admission."""
    gate = Admission(1, 1)
    entered, cancelled, disconnect = asyncio.Event(), asyncio.Event(), asyncio.Event()

    async def receive() -> dict[str, object]:
        await disconnect.wait()
        return {"type": "http.disconnect"}

    request = Request({"type": "http"}, receive)

    async def upstream() -> bytes:
        entered.set()
        try:
            await asyncio.Event().wait()
            return b""
        finally:
            cancelled.set()

    async def work() -> bytes:
        async with gate.slot(1):
            return await connected_job(request, upstream())

    task = asyncio.create_task(work())
    await entered.wait()
    disconnect.set()
    with pytest.raises(HTTPException) as failure:
        await asyncio.wait_for(task, 1)
    assert failure.value.status_code == 499
    assert cancelled.is_set() and gate.active == 0


@pytest.mark.anyio
async def test_logout_cancels_only_owned_jobs() -> None:
    """Account shutdown drains its tasks without stopping another account."""
    gate = Admission(2, 1)
    entered = [asyncio.Event(), asyncio.Event()]

    async def job(owner: int) -> None:
        async with gate.slot(owner):
            entered[owner - 1].set()
            await asyncio.Event().wait()

    first, second = asyncio.create_task(job(1)), asyncio.create_task(job(2))
    await asyncio.gather(*(event.wait() for event in entered))
    await gate.shutdown(1)
    assert first.cancelled() and not second.done()
    assert gate.active == 1 and set(gate.users) == {2}
    await gate.shutdown()
    assert second.cancelled() and gate.active == 0 and not gate.tasks


@pytest.mark.anyio
async def test_chat_admission_covers_stream_body_before_reserving_another_turn() -> (
    None
):
    """A yield dependency must stay occupied after SSE headers until body closes."""
    app = create_app(Settings(chat_max_jobs=1, chat_max_jobs_per_user=1))
    entered, finish = asyncio.Event(), asyncio.Event()
    reservations: list[int] = []

    class Conversations:
        def prepare(self, user: int, identity: int, data: object) -> dict[str, object]:
            reservations.append(identity)
            return {}

        async def stream_turn(self, *args: object) -> AsyncIterator[dict[str, object]]:
            entered.set()
            await finish.wait()
            yield {
                "type": "error",
                "response_id": 1,
                "status": 502,
                "message": "offline",
            }

    app.dependency_overrides[current_user] = lambda: {"UserId": 1}
    app.dependency_overrides[conversation_service] = Conversations
    app.dependency_overrides[get_llm_client] = object
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        payload = {"client_request_id": str(uuid4()), "message": "Hello"}
        task = asyncio.create_task(
            client.post("/api/conversations/1/messages/stream", json=payload)
        )
        await asyncio.wait_for(entered.wait(), 1)
        try:
            for suffix in ("messages", "messages/stream"):
                response = await client.post(
                    f"/api/conversations/2/{suffix}", json=payload
                )
                assert response.status_code == 429
            assert reservations == [1] and app.state.chat_admission.active == 1
        finally:
            finish.set()
            await task
    assert app.state.chat_admission.active == 0


@pytest.mark.anyio
async def test_bilingual_catalog_is_single_flight_and_errors_are_not_cached() -> None:
    """Both languages and later adapter instances share one app-scoped catalog."""
    calls = 0

    async def handle(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        assert request.url.path == "/v1/tts/options"
        if calls == 1:
            return httpx.Response(503)
        return httpx.Response(
            200,
            json={
                "speakers": [
                    {"id": "vi-voice", "name": "VI", "language": "vi"},
                    {"id": "en-voice", "name": "EN", "language": "en"},
                ]
            },
        )

    config = Settings(blaze_api_key=SecretStr("offline-key"))
    cache = VoiceCatalogCache()
    async with httpx.AsyncClient(
        base_url="https://api.blaze.vn", transport=httpx.MockTransport(handle)
    ) as client:
        service = SpeechService(config, http_client=client, catalog_cache=cache)
        with pytest.raises(HTTPException):
            await service.voices("en")
        vi, en = await asyncio.gather(service.voices("vi"), service.voices("en"))
        assert [v.id for v in vi] == ["vi-voice"]
        assert [v.id for v in en] == ["en-voice"]
        await SpeechService(config, http_client=client, catalog_cache=cache).voices(
            "en"
        )
        assert calls == 2
        cache.expires = 0
        await service.voices("en")
        assert calls == 3


def test_compose_forwards_realtime_and_admission_configuration() -> None:
    """Catch silent drift between local and Docker configuration without secrets."""
    root = Path(__file__).resolve().parents[3]
    compose = (root / "docker-compose.yml").read_text(encoding="utf-8")
    example = (root / ".env.example").read_text(encoding="utf-8")
    for name in (
        "BLAZE_STT_MODE",
        "BLAZE_STT_REALTIME_MODEL",
        "SPEECH_MAX_JOBS",
        "CHAT_MAX_JOBS",
        "VOICE_TIMING_LOGS",
    ):
        assert f"{name}: ${{{name}:-" in compose
        assert f"{name}=" in example
