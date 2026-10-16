"""OpenAI Realtime SDP/sideband transport, independent of application storage."""

import json
import logging
import re

import httpx
from fastapi import HTTPException
from websockets.asyncio.client import ClientConnection, connect

from app.core.config import Settings
from app.llm.openai import API_ORIGIN, provider_error


class OpenAIRealtimeClient:
    """Keep all paid provider calls and wire contracts in the AI adapter layer."""

    def __init__(self, settings: Settings) -> None:
        """Share validated private configuration with the Responses adapter."""
        self.settings = settings

    def headers(self) -> dict[str, str]:
        """Keep the standard OpenAI key exclusively in the server transport."""
        if not self.settings.chat_configured or not self.settings.openai_api_key:
            raise HTTPException(503, "OPENAI_API_KEY is not configured.")
        return {
            "Authorization": "Bearer " + self.settings.openai_api_key.get_secret_value()
        }

    async def create(self, sdp: str, prompt: str) -> tuple[str, str]:
        """Create a WebRTC call using a server-owned model/VAD configuration."""
        headers = self.headers()
        config = {
            "type": "realtime",
            "model": self.settings.openai_realtime_model,
            "instructions": prompt,
            "output_modalities": ["audio"],
            "max_output_tokens": self.settings.openai_max_output_tokens,
            "audio": {
                "input": {
                    "transcription": {
                        "model": "gpt-4o-mini-transcribe",
                        "language": "en",
                    },
                    "turn_detection": {
                        "type": "server_vad",
                        "threshold": self.settings.voice_vad_threshold,
                        "silence_duration_ms": self.settings.voice_vad_silence_ms,
                        "prefix_padding_ms": 300,
                        "create_response": True,
                        "interrupt_response": True,
                    },
                },
                "output": {"voice": self.settings.openai_voice},
            },
        }
        async with httpx.AsyncClient(
            timeout=20, follow_redirects=False, trust_env=False
        ) as client:
            response = await client.post(
                API_ORIGIN + "/realtime/calls",
                headers=headers,
                files={
                    "sdp": (None, sdp),
                    "session": (None, json.dumps(config), "application/json"),
                },
            )
        if response.status_code != 201:
            raise provider_error(response.status_code)
        call_id = response.headers.get("Location", "").rsplit("/", 1)[-1]
        if (
            not re.fullmatch(r"rtc_[A-Za-z0-9_-]{1,180}", call_id)
            or len(response.content) > 131072
        ):
            raise HTTPException(502, "Invalid Realtime signaling response.")
        return response.text, call_id

    async def attach(self, call_id: str) -> ClientConnection:
        """Attach the trusted sideband to the provider-issued call identity."""
        logger = logging.getLogger("engmate.realtime.transport")
        # Wire-level DEBUG can include Authorization headers; never enable it.
        logger.setLevel(logging.WARNING)
        return await connect(
            "wss://api.openai.com/v1/realtime?call_id=" + call_id,
            additional_headers=self.headers(),
            open_timeout=10,
            close_timeout=3,
            max_size=262144,
            max_queue=16,
            proxy=None,
            logger=logger,
        )

    async def hangup(self, call_id: str) -> bool:
        """Explicitly close the upstream call; expose uncertainty to the owner."""
        try:
            async with httpx.AsyncClient(timeout=5, trust_env=False) as client:
                response = await client.post(
                    API_ORIGIN + f"/realtime/calls/{call_id}/hangup",
                    headers=self.headers(),
                )
            return response.status_code in (200, 204, 404)
        except (httpx.HTTPError, HTTPException):
            return False
