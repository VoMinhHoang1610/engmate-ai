"""Blaze TTS/STT adapter with bounded requests and secret-free errors."""

import asyncio
import re
from typing import Any, Literal

import httpx
from fastapi import HTTPException

from app.core.config import Settings
from app.schemas.speech import SpeechLanguage, SpeechVoice, STTResponse, TTSRequest

MAX_AUDIO = 8 * 1024 * 1024
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


class SpeechService:
    """Keep the provider token server-side and never follow provider URLs."""

    def __init__(
        self, settings: Settings, transport: httpx.AsyncBaseTransport | None = None
    ) -> None:
        """Allow an isolated HTTP transport for tests without real API calls."""
        self.settings = settings
        self.transport = transport

    def client(self) -> httpx.AsyncClient:
        """Create a scoped client with fixed origin and no redirect forwarding."""
        key = self.settings.blaze_api_key
        if key is None or not key.get_secret_value():
            raise HTTPException(503, "Blaze speech is not configured.")
        return httpx.AsyncClient(
            base_url="https://api.blaze.vn",
            headers={"Authorization": f"Bearer {key.get_secret_value()}"},
            timeout=30,
            follow_redirects=False,
            transport=self.transport,
        )

    async def request(
        self, client: httpx.AsyncClient, method: str, path: str, **kwargs: Any
    ) -> httpx.Response:
        """Bound provider output and map failures without echoing its body."""
        try:
            async with client.stream(method, path, **kwargs) as response:
                if response.status_code == 429:
                    raise HTTPException(
                        503, "Blaze speech quota or rate limit reached."
                    )
                if response.status_code >= 300:
                    raise HTTPException(502, "Blaze speech request failed.")
                content = bytearray()
                async for chunk in response.aiter_bytes():
                    content.extend(chunk)
                    if len(content) > MAX_AUDIO:
                        raise HTTPException(502, "Blaze speech response exceeds limit.")
                return httpx.Response(
                    response.status_code,
                    headers=response.headers,
                    content=bytes(content),
                )
        except httpx.TimeoutException as exc:
            raise HTTPException(504, "Blaze speech timed out.") from exc
        except httpx.RequestError as exc:
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

    async def voices(self, language: SpeechLanguage) -> list[SpeechVoice]:
        """Fetch the current catalog and return only safe selectable fields."""
        async with self.client() as client:
            data = self.object(await self.request(client, "GET", "/v1/tts/options"))
        speakers = data.get("speakers")
        if not isinstance(speakers, list):
            raise HTTPException(502, "Invalid Blaze voice catalog.")
        result: dict[str, SpeechVoice] = {}
        for speaker in speakers:
            if not isinstance(speaker, dict) or speaker.get("language") != language:
                continue
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
        try:
            async with asyncio.timeout(90), self.client() as client:
                result = self.object(
                    await self.request(
                        client,
                        "POST",
                        "/v1/tts",
                        json={
                            "query": data.text,
                            "language": data.language,
                            "speaker_id": data.speaker_id
                            or (
                                "UK-Nu-1-TM" if data.language == "en" else "HN-Nam-1-BL"
                            ),
                            "model": self.settings.blaze_tts_model,
                            "audio_speed": data.speed,
                            "audio_format": "mp3",
                        },
                    )
                )
                identity = result.get("id")
                if not isinstance(identity, str) or not re.fullmatch(
                    r"[A-Za-z0-9_-]{1,128}", identity
                ):
                    raise HTTPException(502, "Invalid Blaze TTS job.")
                while True:
                    info = self.object(
                        await self.request(client, "GET", f"/v1/tts/{identity}/info")
                    )
                    if info.get("status") == "completed":
                        audio = await self.request(
                            client, "GET", f"/v1/tts/{identity}/download"
                        )
                        if not (
                            audio.content.startswith(b"ID3")
                            or (
                                len(audio.content) >= 4
                                and audio.content[0] == 0xFF
                                and audio.content[1] & 0xE0 == 0xE0
                            )
                        ):
                            raise HTTPException(502, "Invalid Blaze TTS audio.")
                        return audio.content
                    if info.get("status") in {"failed", "error", "cancelled"}:
                        raise HTTPException(502, "Blaze TTS generation failed.")
                    await asyncio.sleep(0.5)
        except TimeoutError as exc:
            raise HTTPException(504, "Blaze TTS job timed out.") from exc

    async def transcribe(
        self, content: bytes, content_type: str, language: SpeechLanguage
    ) -> STTResponse:
        """Send a bounded audio file and extract the documented transcript."""
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
        return STTResponse(text=text, language=language)
