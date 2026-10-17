"""Private Gemini Live WebSocket setup; no standard API key reaches a browser."""

import asyncio
import json
import logging

from fastapi import HTTPException
from websockets.asyncio.client import ClientConnection, connect

from app.core.config import Settings
from app.llm.base import ContextMessage
from app.llm.gemini import contents

LIVE_URL = (
    "wss://generativelanguage.googleapis.com/ws/"
    "google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
)

# A curated subset of Google's prebuilt voices; no paid catalog request is needed.
LIVE_VOICES = {
    "Kore": "Rõ ràng, chắc chắn",
    "Puck": "Vui vẻ, lạc quan",
    "Charon": "Mạch lạc, truyền đạt",
    "Fenrir": "Sôi nổi",
    "Aoede": "Nhẹ nhàng, thoải mái",
    "Leda": "Trẻ trung",
    "Orus": "Chắc chắn",
    "Zephyr": "Tươi sáng",
}


class GeminiLiveClient:
    """Use an authenticated server connection and wait for provider setup ack."""

    def __init__(self, settings: Settings) -> None:
        """Keep validated private configuration in the backend AI layer."""
        self.settings = settings

    def headers(self) -> dict[str, str]:
        """Check the chosen provider and credential before reserving resources."""
        if self.settings.llm_provider != "gemini" or not self.settings.gemini_api_key:
            raise HTTPException(503, "GEMINI_API_KEY chưa được cấu hình.")
        return {"x-goog-api-key": self.settings.gemini_api_key.get_secret_value()}

    def voices(self) -> dict[str, str]:
        """Include the administrator's configured default in the public catalog."""
        return {
            **LIVE_VOICES,
            self.settings.gemini_voice: LIVE_VOICES.get(
                self.settings.gemini_voice, "Giọng mặc định"
            ),
        }

    def select_voice(self, voice_id: str | None) -> str:
        """Reject unsupported IDs before opening any provider connection."""
        selected = voice_id or self.settings.gemini_voice
        if selected not in self.voices():
            raise HTTPException(422, "Giọng đối thoại không được hỗ trợ.")
        return selected

    async def open(
        self, prompt: str, history: list[ContextMessage], voice_id: str | None = None
    ) -> ClientConnection:
        """Configure native PCM audio, transcription, server VAD and role history."""
        voice = self.select_voice(voice_id)
        logger = logging.getLogger("engmate.gemini.transport")
        logger.setLevel(logging.WARNING)
        settings = self.settings
        socket = await connect(
            LIVE_URL,
            additional_headers=self.headers(),
            open_timeout=10,
            close_timeout=3,
            max_size=262144,
            max_queue=16,
            proxy=None,
            logger=logger,
        )
        try:
            await socket.send(
                json.dumps(
                    {
                        "setup": {
                            "model": "models/" + self.settings.gemini_live_model,
                            "generationConfig": {
                                "responseModalities": ["AUDIO"],
                                "maxOutputTokens": settings.gemini_max_output_tokens,
                                "speechConfig": {
                                    "voiceConfig": {
                                        "prebuiltVoiceConfig": {"voiceName": voice}
                                    }
                                },
                            },
                            "systemInstruction": {"parts": [{"text": prompt}]},
                            "inputAudioTranscription": {},
                            "outputAudioTranscription": {},
                            "historyConfig": {"initialHistoryInClientContent": True},
                            "realtimeInputConfig": {
                                "automaticActivityDetection": {
                                    "disabled": False,
                                    "silenceDurationMs": settings.voice_vad_silence_ms,
                                    "prefixPaddingMs": 300,
                                },
                                "activityHandling": "START_OF_ACTIVITY_INTERRUPTS",
                            },
                        }
                    }
                )
            )
            event = json.loads(await asyncio.wait_for(socket.recv(), 15))
            if "setupComplete" not in event:
                raise ValueError("Gemini Live setup rejected")
            await socket.send(
                json.dumps(
                    {
                        "clientContent": {
                            "turns": contents(history),
                            "turnComplete": True,
                        }
                    }
                )
            )
            return socket
        except BaseException:
            await socket.close()
            raise

    async def audio(self, socket: ClientConnection, encoded: str | None) -> None:
        """Forward only validated PCM audio or a deliberate end-of-audio signal."""
        await socket.send(
            json.dumps(
                {
                    "realtimeInput": (
                        {"audio": {"data": encoded, "mimeType": "audio/pcm;rate=16000"}}
                        if encoded is not None
                        else {"audioStreamEnd": True}
                    )
                }
            )
        )
