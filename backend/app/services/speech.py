"""Blaze TTS/STT adapter with bounded requests and secret-free errors."""

import asyncio
import logging
import re
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from time import monotonic
from typing import Any, Literal

import httpx
from fastapi import HTTPException

from app.core.config import Settings
from app.core.voice_timing import VoiceTimings
from app.schemas.speech import SpeechLanguage, SpeechVoice, STTResponse, TTSRequest

MAX_AUDIO = 8 * 1024 * 1024
# Blaze often finishes a short sentence in under a second. Fast polling removes
# up to half a second of avoidable delay without retrying the paid create call.
TTS_POLL_FAST_SECONDS = 0.2
TTS_POLL_FAST_ATTEMPTS = 5
TTS_POLL_MEDIUM_SECONDS = 0.35
TTS_POLL_MEDIUM_ATTEMPTS = 10
TTS_POLL_MAX_SECONDS = 0.5
TTS_RATE_LIMIT_DETAIL = "Blaze speech quota or rate limit reached."
TTS_CREATE_ATTEMPTS = 3
# A short cool-down usually clears a burst limit without keeping the learner
# waiting through a full provider quota window.
TTS_CREATE_RETRY_SECONDS = (0.6, 1.2)


def poll_delay(attempt: int) -> float:
    """Back off from fast polling to protect provider limits on slow jobs."""
    if attempt < TTS_POLL_FAST_ATTEMPTS:
        return TTS_POLL_FAST_SECONDS
    if attempt < TTS_POLL_MEDIUM_ATTEMPTS:
        return TTS_POLL_MEDIUM_SECONDS
    return TTS_POLL_MAX_SECONDS


logger = logging.getLogger("engmate.blaze.speech")
AUDIO_TYPES = {
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/mpeg": "mp3",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/flac": "flac",
    "audio/mp4": "m4a",
    "audio/aac": "aac",
}


class VoiceCatalogCache:
    """App-local, single-flight catalog shared by both languages for five minutes."""

    def __init__(self) -> None:
        """Do not share provider metadata across differently configured apps."""
        self.lock = asyncio.Lock()
        self.expires = 0.0
        self.voices: list[SpeechVoice] = []


class SpeechService:
    """Keep the provider token server-side and never follow provider URLs."""

    def __init__(
        self,
        settings: Settings,
        transport: httpx.AsyncBaseTransport | None = None,
        *,
        http_client: httpx.AsyncClient | None = None,
        catalog_cache: VoiceCatalogCache | None = None,
    ) -> None:
        """Allow an isolated HTTP transport for tests without real API calls."""
        self.settings = settings
        self.transport = transport
        self.http_client = http_client
        self.catalog_cache = catalog_cache or VoiceCatalogCache()

    @asynccontextmanager
    async def client(self) -> AsyncIterator[httpx.AsyncClient]:
        """Borrow the app pool, or scope an isolated client for offline tests."""
        key = self.settings.blaze_api_key
        if key is None or not key.get_secret_value():
            raise HTTPException(503, "Blaze speech is not configured.")
        if self.http_client is not None:
            yield self.http_client
            return
        async with httpx.AsyncClient(
            base_url="https://api.blaze.vn",
            headers={"Authorization": f"Bearer {key.get_secret_value()}"},
            timeout=30,
            follow_redirects=False,
            transport=self.transport,
        ) as client:
            yield client

    async def request(
        self,
        client: httpx.AsyncClient,
        method: str,
        path: str,
        *,
        timing: VoiceTimings | None = None,
        first_byte_stage: str = "",
        **kwargs: Any,
    ) -> httpx.Response:
        """Bound provider output and map failures without echoing its body."""
        operation = (
            "tts_create"
            if path == "/v1/tts"
            else (
                "tts_poll"
                if path.endswith("/info")
                else (
                    "tts_download"
                    if path.endswith("/download")
                    else (
                        "stt"
                        if path == "/v1/stt/execute"
                        else "catalog" if path == "/v1/tts/options" else "other"
                    )
                )
            )
        )
        key = self.settings.blaze_api_key
        if not key:
            raise HTTPException(503, "Blaze speech is not configured.")
        kwargs["headers"] = {"Authorization": f"Bearer {key.get_secret_value()}"}
        try:
            async with client.stream(method, path, **kwargs) as response:
                if response.status_code >= 300:
                    # Never log URLs/job IDs, response bodies, credentials or text.
                    logger.warning(
                        "speech_failure operation=%s status=%s",
                        operation,
                        response.status_code,
                    )
                if response.status_code == 429:
                    raise HTTPException(503, TTS_RATE_LIMIT_DETAIL)
                if response.status_code >= 300:
                    raise HTTPException(502, "Blaze speech request failed.")
                content = bytearray()
                async for chunk in response.aiter_bytes():
                    if chunk and timing is not None:
                        timing.mark(first_byte_stage)
                    content.extend(chunk)
                    if len(content) > MAX_AUDIO:
                        raise HTTPException(502, "Blaze speech response exceeds limit.")
                return httpx.Response(
                    response.status_code,
                    headers=response.headers,
                    content=bytes(content),
                )
        except httpx.TimeoutException as exc:
            logger.warning("speech_failure operation=%s reason=timeout", operation)
            raise HTTPException(504, "Blaze speech timed out.") from exc
        except httpx.RequestError as exc:
            logger.warning("speech_failure operation=%s reason=transport", operation)
            raise HTTPException(502, "Blaze speech is unavailable.") from exc

    @staticmethod
    def object(response: httpx.Response) -> dict[str, Any]:
        """Reject malformed provider payloads instead of inventing a result."""
        try:
            data: Any = response.json()
        except ValueError as exc:
            raise HTTPException(502, "Invalid Blaze speech response.") from exc
        if not isinstance(data, dict):
            raise HTTPException(502, "Invalid Blaze speech response.")
        return data

    async def create_tts_job(
        self, client: httpx.AsyncClient, data: TTSRequest
    ) -> httpx.Response:
        """Retry only provider rate limits; generation failures are not replayed."""
        payload = {
            "query": data.text,
            "language": data.language,
            "speaker_id": data.speaker_id
            or ("UK-Nu-1-TM" if data.language == "en" else "HN-Nam-1-BL"),
            "model": self.settings.blaze_tts_model,
            "audio_speed": data.speed,
            "audio_format": "mp3",
        }
        for attempt in range(TTS_CREATE_ATTEMPTS):
            try:
                return await self.request(client, "POST", "/v1/tts", json=payload)
            except HTTPException as exc:
                if (
                    exc.status_code != 503
                    or exc.detail != TTS_RATE_LIMIT_DETAIL
                    or attempt + 1 >= TTS_CREATE_ATTEMPTS
                ):
                    raise
                logger.warning(
                    "speech_retry operation=tts_create attempt=%s", attempt + 1
                )
                await asyncio.sleep(TTS_CREATE_RETRY_SECONDS[attempt])
        raise AssertionError("TTS retry loop exhausted.")

    async def voices(self, language: SpeechLanguage) -> list[SpeechVoice]:
        """Coalesce concurrent callers without caching errors or cancelling siblings."""
        cache = self.catalog_cache
        async with cache.lock:
            if monotonic() >= cache.expires:
                cache.voices = await self.load_voices()
                cache.expires = monotonic() + 300
            return [
                voice.model_copy()
                for voice in cache.voices
                if voice.language == language
            ]

    async def load_voices(self) -> list[SpeechVoice]:
        """Fetch and validate the bilingual upstream catalog in a single request."""
        async with self.client() as client:
            data = self.object(await self.request(client, "GET", "/v1/tts/options"))
        speakers = data.get("speakers")
        if not isinstance(speakers, list):
            raise HTTPException(502, "Invalid Blaze voice catalog.")
        result: dict[str, SpeechVoice] = {}
        for speaker in speakers:
            if not isinstance(speaker, dict) or speaker.get("language") not in {
                "en",
                "vi",
            }:
                continue
            language: SpeechLanguage = speaker["language"]
            identity, name = speaker.get("id"), speaker.get("name")
            if (
                not isinstance(identity, str)
                or not re.fullmatch(r"[A-Za-z0-9_-]{1,120}", identity)
                or not isinstance(name, str)
                or not name.strip()
                or len(name) > 200
            ):
                raise HTTPException(502, "Invalid Blaze voice catalog.")
            gender = str(speaker.get("gender", "")).lower()
            voice_gender: Literal["male", "female"] | None = None
            if gender == "male":
                voice_gender = "male"
            elif gender == "female":
                voice_gender = "female"
            result[identity] = SpeechVoice(
                id=identity,
                name=name.strip(),
                language=language,
                gender=voice_gender,
            )
        return sorted(result.values(), key=lambda voice: voice.name.casefold())

    async def synthesize(self, data: TTSRequest) -> bytes:
        """Create one TTS job, await completion and return MP3 bytes."""
        timing = VoiceTimings()
        try:
            async with asyncio.timeout(90), self.client() as client:
                result = self.object(await self.create_tts_job(client, data))
                identity = result.get("id")
                timing.mark("tts_job_created")
                if not isinstance(identity, str) or not re.fullmatch(
                    r"[A-Za-z0-9_-]{1,128}", identity
                ):
                    logger.warning("speech_failure operation=tts_job reason=invalid_id")
                    raise HTTPException(502, "Invalid Blaze TTS job.")
                attempt = 0
                while True:
                    info = self.object(
                        await self.request(client, "GET", f"/v1/tts/{identity}/info")
                    )
                    if info.get("status") == "completed":
                        timing.mark("tts_job_ready")
                        audio = await self.request(
                            client,
                            "GET",
                            f"/v1/tts/{identity}/download",
                            timing=timing,
                            first_byte_stage="tts_first_audio",
                        )
                        if not (
                            audio.content.startswith(b"ID3")
                            or (
                                len(audio.content) >= 4
                                and audio.content[0] == 0xFF
                                and audio.content[1] & 0xE0 == 0xE0
                            )
                        ):
                            logger.warning(
                                "speech_failure operation=tts_audio "
                                "reason=invalid bytes=%d",
                                len(audio.content),
                            )
                            raise HTTPException(502, "Invalid Blaze TTS audio.")
                        timing.mark("tts_download_complete")
                        return audio.content
                    status = info.get("status")
                    if status in {"failed", "error", "cancelled"}:
                        logger.warning(
                            "speech_failure operation=tts_job status=%s", status
                        )
                        raise HTTPException(502, "Blaze TTS generation failed.")
                    await asyncio.sleep(poll_delay(attempt))
                    attempt += 1
        except TimeoutError as exc:
            logger.warning("speech_failure operation=tts_job reason=timeout")
            raise HTTPException(504, "Blaze TTS job timed out.") from exc

    async def transcribe(
        self, content: bytes, content_type: str, language: SpeechLanguage
    ) -> STTResponse:
        """Send a bounded audio file and extract the documented transcript."""
        timing = VoiceTimings()
        if not content:
            raise HTTPException(422, "Audio file is empty.")
        if len(content) > MAX_AUDIO:
            raise HTTPException(413, "Audio exceeds 8 MiB.")
        mime = content_type.split(";", 1)[0].strip().lower()
        extension = AUDIO_TYPES.get(mime)
        if extension is None:
            raise HTTPException(422, "Unsupported audio format.")
        async with self.client() as client:
            data = self.object(
                await self.request(
                    client,
                    "POST",
                    "/v1/stt/execute",
                    params={
                        "language": language,
                        "model": self.settings.blaze_stt_model,
                        "lazy_process": "false",
                    },
                    files={"audio_file": (f"recording.{extension}", content, mime)},
                )
            )
        try:
            text = data["result"]["data"]["transcription"]
        except (KeyError, TypeError) as exc:
            raise HTTPException(502, "Invalid Blaze STT result.") from exc
        if not isinstance(text, str):
            raise HTTPException(502, "Invalid Blaze STT transcript.")
        timing.mark("stt_final")
        return STTResponse(text=text, language=language)
