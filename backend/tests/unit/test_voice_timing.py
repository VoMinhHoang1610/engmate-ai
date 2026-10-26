"""Verify timing privacy, shared HTTP ownership and lifecycle without paid calls."""

import asyncio
import json
import logging
from unittest.mock import AsyncMock
from uuid import uuid4

import httpx
import pytest
from fastapi import Request
from pydantic import SecretStr

from app.api.dependencies import get_llm_client
from app.core.config import Settings
from app.core.voice_timing import VoiceTimings, voice_trace
from app.llm.gemini import GeminiLLMClient
from app.main import create_app
from app.schemas.speech import TTSRequest
from app.services.speech import SpeechService
from tests.unit.test_gemini import sse

pytestmark = pytest.mark.anyio


async def test_app_owns_and_closes_both_provider_pools() -> None:
    """No provider call is necessary to open/close a lifespan-managed pool."""
    app = create_app(Settings(gemini_api_key=SecretStr("brain")))
    async with app.router.lifespan_context(app):
        speech: httpx.AsyncClient = app.state.speech_http
        gemini: httpx.AsyncClient = app.state.gemini_http
        assert not speech.is_closed and not gemini.is_closed
        llm = get_llm_client(Request({"type": "http", "app": app}))
        assert isinstance(llm, GeminiLLMClient)
        assert llm.http_client is gemini
    assert speech.is_closed and gemini.is_closed
    assert app.state.speech_http is None and app.state.gemini_http is None


async def test_pools_close_even_if_voice_shutdown_fails() -> None:
    """Shutdown errors cannot leak application-wide HTTP resources."""
    app = create_app(Settings())
    app.state.voice.shutdown = AsyncMock(side_effect=RuntimeError("shutdown"))
    with pytest.raises(RuntimeError, match="shutdown"):
        async with app.router.lifespan_context(app):
            speech, gemini = app.state.speech_http, app.state.gemini_http
    assert speech.is_closed and gemini.is_closed


async def test_borrowed_speech_pool_survives_stt_tts_and_concurrent_catalog() -> None:
    """Adapters must not close a shared client between independent requests."""

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["authorization"] == "Bearer speech-private"
        if request.url.path == "/v1/stt/execute":
            return httpx.Response(
                200, json={"result": {"data": {"transcription": "Hello"}}}
            )
        if request.url.path == "/v1/tts/options":
            return httpx.Response(200, json={"speakers": []})
        if request.url.path == "/v1/tts":
            return httpx.Response(202, json={"id": "job-1"})
        if request.url.path.endswith("info"):
            return httpx.Response(200, json={"status": "completed"})
        return httpx.Response(200, content=b"ID3audio")

    async with httpx.AsyncClient(
        base_url="https://api.blaze.vn", transport=httpx.MockTransport(handler)
    ) as pool:
        service = SpeechService(
            Settings(blaze_api_key=SecretStr("speech-private")), http_client=pool
        )
        assert (await service.transcribe(b"wav", "audio/wav", "en")).text == "Hello"
        assert await service.synthesize(TTSRequest(text="Hello")) == b"ID3audio"
        english, vietnamese = await asyncio.gather(
            service.voices("en"), service.voices("vi")
        )
        assert english == [] and vietnamese == []
        assert not pool.is_closed


async def test_borrowed_gemini_pool_is_reused_without_leaking_headers() -> None:
    """Per-request credentials remain outside reusable client defaults."""

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["x-goog-api-key"] == "brain-private"
        assert "authorization" not in request.headers
        return sse(
            {
                "candidates": [
                    {"content": {"parts": [{"text": "Hello"}]}, "finishReason": "STOP"}
                ]
            }
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as pool:
        client = GeminiLLMClient(
            Settings(gemini_api_key=SecretStr("brain-private")), http_client=pool
        )
        for _ in range(2):
            assert await client.generate("User text", "A2", "Prompt") == "Hello"
        assert not pool.is_closed
        assert "x-goog-api-key" not in pool.headers


async def test_cancelled_gemini_request_does_not_close_the_shared_pool() -> None:
    """Cancelling one turn must leave other users' provider requests usable."""
    started = asyncio.Event()

    async def handler(request: httpx.Request) -> httpx.Response:
        if json.loads(request.content)["contents"][-1]["parts"][0]["text"] == "slow":
            started.set()
            await asyncio.Event().wait()
        return sse(
            {
                "candidates": [
                    {"content": {"parts": [{"text": "Hi"}]}, "finishReason": "STOP"}
                ]
            }
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as pool:
        client = GeminiLLMClient(
            Settings(gemini_api_key=SecretStr("brain-private")), http_client=pool
        )
        old = asyncio.create_task(client.generate("slow", "A2", "Prompt"))
        await started.wait()
        old.cancel()
        with pytest.raises(asyncio.CancelledError):
            await old
        assert await client.generate("next", "A2", "Prompt") == "Hi"
        assert not pool.is_closed


async def test_voice_trace_is_validated_private_and_reset(
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Only a UUID and known stage labels reach timing logs, never speech payloads."""
    app = create_app(
        Settings(blaze_api_key=SecretStr("private-key"), blaze_local_demo=True)
    )
    identity = str(uuid4())
    caplog.set_level(logging.INFO, logger="engmate.voice.latency")
    async with httpx.AsyncClient(
        base_url="https://api.blaze.vn",
        transport=httpx.MockTransport(
            lambda _: httpx.Response(
                200, json={"result": {"data": {"transcription": "private transcript"}}}
            )
        ),
    ) as pool:
        app.state.speech_http = pool
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app, client=("127.0.0.1", 1)),
            base_url="http://test",
        ) as api:
            for trace in (identity, "invalid-private-value"):
                result = await api.post(
                    f"/api/speech/stt?voice_trace_id={trace}",
                    files={"file": ("test.wav", b"wav", "audio/wav")},
                )
                assert result.status_code == 200
    records = [
        r.getMessage() for r in caplog.records if r.name == "engmate.voice.latency"
    ]
    assert len(records) == 1 and identity in records[0] and "stt_final" in records[0]
    assert "private" not in records[0]
    assert voice_trace.get() is None
    VoiceTimings().mark("untraced")
    assert len([r for r in caplog.records if r.name == "engmate.voice.latency"]) == 1
