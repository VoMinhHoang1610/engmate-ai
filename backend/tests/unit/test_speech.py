"""Verify speech contracts, failure handling and access without paid calls."""

import io
import json
import wave
from collections.abc import Callable

import httpx
import pytest
from fastapi import HTTPException
from pydantic import SecretStr

from app.api.speech_routes import speech_service
from app.core.config import Settings
from app.main import create_app
from app.schemas.speech import TTSRequest
from app.services.speech import MAX_AUDIO, SpeechService

pytestmark = pytest.mark.anyio
MP3 = b"\xff\xfb\x94\xc4" + b"\0" * 32


def wav_bytes() -> bytes:
    """Build a short actual WAV fixture rather than a fake provider URL."""
    output = io.BytesIO()
    with wave.open(output, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(16000)
        audio.writeframes(b"\0\0" * 160)
    return output.getvalue()


def service(handler: Callable[[httpx.Request], httpx.Response]) -> SpeechService:
    """Use a dummy secret and an HTTP mock transport."""
    return SpeechService(
        Settings(blaze_api_key=SecretStr("test-secret")),
        httpx.MockTransport(handler),
    )


async def test_tts_job_and_audio() -> None:
    """Submit once, poll pending/completed, then download at the fixed origin."""
    calls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["authorization"] == "Bearer test-secret"
        assert request.url.host == "api.blaze.vn"
        calls.append(request.url.path)
        if request.method == "POST":
            payload = json.loads(request.content)
            assert payload["query"] == "Hello"
            assert payload["language"] == "en"
            assert payload["speaker_id"] == "UK-Nu-1-TM"
            assert payload["audio_format"] == "mp3"
            assert "media_type" not in payload
            return httpx.Response(202, json={"id": "job-1"})
        if request.url.path.endswith("info"):
            status = "pending" if calls.count(request.url.path) == 1 else "completed"
            return httpx.Response(200, json={"status": status})
        return httpx.Response(200, content=MP3)

    assert await service(handler).synthesize(TTSRequest(text="Hello")) == MP3
    assert calls.count("/v1/tts") == 1
    assert calls[-1] == "/v1/tts/job-1/download"


async def test_stt_multipart() -> None:
    """Send the documented multipart field and synchronous English parameters."""

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/stt/execute"
        assert request.url.params["language"] == "en"
        assert request.url.params["lazy_process"] == "false"
        assert b'name="audio_file"' in request.content
        assert wav_bytes() in request.content
        return httpx.Response(
            200, json={"result": {"data": {"transcription": "Hello"}}}
        )

    result = await service(handler).transcribe(wav_bytes(), "audio/wav", "en")
    assert result.model_dump() == {
        "text": "Hello",
        "language": "en",
        "provider": "blaze",
    }


@pytest.mark.parametrize(
    "status,expected", [(401, 502), (500, 502), (429, 503), (302, 502)]
)
async def test_provider_errors(status: int, expected: int) -> None:
    """Do not expose provider credentials, bodies or redirects on failure."""
    adapter = service(lambda _: httpx.Response(status, text="test-secret private data"))
    with pytest.raises(HTTPException) as error:
        await adapter.transcribe(wav_bytes(), "audio/wav", "en")
    assert error.value.status_code == expected
    assert "test-secret" not in error.value.detail
    assert "private data" not in error.value.detail


async def test_timeout() -> None:
    """Translate network timeouts without leaking the request."""

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("private data", request=request)

    with pytest.raises(HTTPException) as error:
        await service(handler).synthesize(TTSRequest(text="Hello"))
    assert error.value.status_code == 504


@pytest.mark.parametrize(
    "kind", ["bad-id", "failed", "bad-audio", "bad-json", "network"]
)
async def test_tts_bad_results(kind: str) -> None:
    """Invalid jobs, provider failures and non-audio output remain errors."""

    def handler(request: httpx.Request) -> httpx.Response:
        if kind == "network":
            raise httpx.ConnectError("private data", request=request)
        if request.method == "POST":
            if kind == "bad-json":
                return httpx.Response(202, text="invalid-json")
            return httpx.Response(
                202, json={"id": "../other" if kind == "bad-id" else "job-1"}
            )
        if request.url.path.endswith("info"):
            return httpx.Response(
                200, json={"status": "failed" if kind == "failed" else "completed"}
            )
        return httpx.Response(200, content=b"not audio")

    with pytest.raises(HTTPException) as error:
        await service(handler).synthesize(TTSRequest(text="Hello"))
    assert error.value.status_code == 502


@pytest.mark.parametrize(
    "payload", [{}, {"result": {"data": {"transcription": 123}}}, ["invalid"]]
)
async def test_invalid_stt_response(payload: object) -> None:
    """Malformed responses cannot become successful empty transcripts."""
    with pytest.raises(HTTPException) as error:
        await service(lambda _: httpx.Response(200, json=payload)).transcribe(
            wav_bytes(), "audio/wav", "en"
        )
    assert error.value.status_code == 502


@pytest.mark.parametrize(
    "content,mime,status",
    [
        (b"", "audio/wav", 422),
        (b"x", "text/plain", 422),
        (b"x" * (MAX_AUDIO + 1), "audio/wav", 413),
    ],
    ids=["empty", "unsupported", "oversized"],
)
async def test_invalid_upload(content: bytes, mime: str, status: int) -> None:
    """Reject invalid or oversized uploads before any provider request."""

    def handler(request: httpx.Request) -> httpx.Response:
        raise AssertionError("Provider must not be called")

    with pytest.raises(HTTPException) as error:
        await service(handler).transcribe(content, mime, "en")
    assert error.value.status_code == status


async def test_missing_key() -> None:
    """An unconfigured provider fails explicitly."""
    with pytest.raises(HTTPException) as error:
        await SpeechService(Settings()).synthesize(TTSRequest(text="Hello"))
    assert error.value.status_code == 503


@pytest.mark.parametrize(
    "demo,peer,expected",
    [(False, "127.0.0.1", 401), (True, "203.0.113.1", 401), (True, "127.0.0.1", 503)],
)
async def test_speech_access(demo: bool, peer: str, expected: int) -> None:
    """Anonymous use requires an explicit demo flag and a loopback peer."""
    app = create_app(Settings(blaze_local_demo=demo))
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app, client=(peer, 1234)),
        base_url="http://test",
    ) as client:
        response = await client.post("/api/speech/tts", json={"text": "Hello"})
    assert response.status_code == expected


async def test_speech_routes() -> None:
    """Return playable audio and a stable transcript through the HTTP surface."""
    app = create_app(Settings())

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/v1/tts":
            return httpx.Response(202, json={"id": "job-1"})
        if request.url.path.endswith("info"):
            return httpx.Response(200, json={"status": "completed"})
        if request.url.path.endswith("download"):
            return httpx.Response(200, content=MP3)
        return httpx.Response(
            200, json={"result": {"data": {"transcription": "Hello"}}}
        )

    app.dependency_overrides[speech_service] = lambda: service(handler)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        tts = await client.post("/api/speech/tts", json={"text": "Hello"})
        assert tts.status_code == 200
        assert tts.headers["content-type"] == "audio/mpeg"
        assert tts.content == MP3
        stt = await client.post(
            "/api/speech/stt", files={"file": ("test.wav", wav_bytes(), "audio/wav")}
        )
        assert stt.status_code == 200
        assert stt.json()["text"] == "Hello"
        invalid = await client.post("/api/speech/tts", json={"text": " "})
        assert invalid.status_code == 422


async def test_local_demo_rejects_foreign_origin() -> None:
    """A foreign website cannot spend the local demo's speech credits."""
    app = create_app(Settings(blaze_local_demo=True))
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app, client=("127.0.0.1", 1234)),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/api/speech/stt",
            headers={"Origin": "https://untrusted.example"},
            files={"file": ("test.wav", wav_bytes(), "audio/wav")},
        )
    assert response.status_code == 403


async def test_voice_catalog() -> None:
    """Filter language, normalize gender and strip provider-specific fields."""

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/tts/options"
        return httpx.Response(
            200,
            json={
                "speakers": [
                    {
                        "id": "voice-1",
                        "name": " Alice ",
                        "language": "en",
                        "gender": "Female",
                        "audio_preview": "https://private.example/clip",
                    },
                    {
                        "id": "voice-2",
                        "name": "Brian",
                        "language": "en",
                        "gender": "Male",
                    },
                    {"id": "voice-3", "name": "Other", "language": "en"},
                    {"id": "voice-vi", "name": "Vietnamese", "language": "vi"},
                ]
            },
        )

    result = await service(handler).voices("en")
    assert [voice.model_dump() for voice in result] == [
        {"id": "voice-1", "name": "Alice", "language": "en", "gender": "female"},
        {"id": "voice-2", "name": "Brian", "language": "en", "gender": "male"},
        {"id": "voice-3", "name": "Other", "language": "en", "gender": None},
    ]


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"speakers": "bad"},
        {"speakers": [{"id": "../invalid", "name": "Bad", "language": "en"}]},
    ],
)
async def test_invalid_voice_catalog(payload: object) -> None:
    """Malformed catalogs fail without returning unsafe voice identifiers."""
    with pytest.raises(HTTPException) as error:
        await service(lambda _: httpx.Response(200, json=payload)).voices("en")
    assert error.value.status_code == 502


async def test_voice_route() -> None:
    """Expose a typed catalog through the same protected speech dependency."""
    app = create_app(Settings())
    app.dependency_overrides[speech_service] = lambda: service(
        lambda _: httpx.Response(
            200,
            json={"speakers": [{"id": "voice-1", "name": "Alice", "language": "en"}]},
        )
    )
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/speech/voices?language=en")
        assert response.status_code == 200
        assert response.json()[0]["id"] == "voice-1"
        assert (await client.get("/api/speech/voices?language=bad")).status_code == 422
