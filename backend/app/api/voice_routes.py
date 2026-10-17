"""Private signaling/heartbeat controls; media flows directly over WebRTC."""

import asyncio
import json
from time import monotonic
from uuid import UUID

from fastapi import (
    APIRouter,
    HTTPException,
    Request,
    Response,
    WebSocket,
    WebSocketDisconnect,
)
from pydantic import Field

from app.api.chat_routes import Identity, User
from app.db.database import Record
from app.schemas.chat import Input
from app.services.gemini_voice import GeminiVoiceManager
from app.services.realtime import RealtimeManager

router = APIRouter(prefix="/api", tags=["voice"])


class VoiceOffer(Input):
    """Bound the SDP received from an authenticated browser."""

    sdp: str | None = Field(default=None, min_length=10, max_length=64000)
    voice_id: str | None = Field(default=None, pattern=r"^[a-zA-Z0-9_-]{1,64}$")


@router.get("/voice/voices")
def voice_catalog(user: User, request: Request) -> Record:
    """Expose supported live voices, separately from the Blaze reading catalog."""
    manager = request.app.state.voice
    settings = request.app.state.settings
    voices = (
        manager.live.voices()
        if isinstance(manager, GeminiVoiceManager)
        else {settings.openai_voice: "Giọng mặc định"}
    )
    return {
        "provider": settings.llm_provider,
        "default_voice": (
            settings.gemini_voice
            if isinstance(manager, GeminiVoiceManager)
            else settings.openai_voice
        ),
        "voices": [
            {"id": key, "name": key + " · " + name} for key, name in voices.items()
        ],
    }


@router.post("/conversations/{identity}/voice")
async def start_voice(
    identity: Identity, data: VoiceOffer, user: User, request: Request
) -> Record:
    """Check ownership/open state before any paid provider signaling call."""
    manager: RealtimeManager = request.app.state.voice
    if isinstance(manager, GeminiVoiceManager):
        return await manager.start(user["UserId"], identity, voice_id=data.voice_id)
    if (
        data.voice_id is not None
        and data.voice_id != request.app.state.settings.openai_voice
    ):
        raise HTTPException(422, "Giọng đối thoại không được hỗ trợ.")
    if data.sdp is None:
        raise HTTPException(422, "SDP is required for the OpenAI transport.")
    return await manager.start(user["UserId"], identity, data.sdp)


@router.websocket("/voice/{session_id}/audio")
async def gemini_audio(websocket: WebSocket, session_id: UUID) -> None:
    """Require allowed Origin and a REST-issued one-use ticket before audio relay."""
    manager = websocket.app.state.voice
    settings = websocket.app.state.settings
    if (
        not isinstance(manager, GeminiVoiceManager)
        or websocket.headers.get("origin") not in settings.cors_origins
    ):
        await websocket.close(code=4403)
        return
    await websocket.accept()
    try:
        raw = await asyncio.wait_for(websocket.receive_text(), 5)
        if len(raw) > 256:
            raise ValueError("Oversized ticket message")
        data = json.loads(raw)
        ticket = data.get("ticket")
        if not isinstance(ticket, str) or not 32 <= len(ticket) <= 128:
            raise ValueError("Invalid ticket")
        await manager.attach_browser(str(session_id), ticket, websocket)
    except (ValueError, TypeError, AttributeError, TimeoutError):
        await websocket.close(code=4401)
    except WebSocketDisconnect:
        pass


@router.post("/voice/{session_id}/heartbeat")
def heartbeat(session_id: UUID, user: User, request: Request) -> Record:
    """Keep calls alive only while the authenticated owning browser is active."""
    session = request.app.state.voice.owned(user["UserId"], str(session_id))
    session.heartbeat = monotonic()
    return {"state": session.state}


@router.delete("/voice/{session_id}", status_code=204)
async def end_voice(session_id: UUID, user: User, request: Request) -> Response:
    """Cancel pending generation and close sideband/upstream call resources."""
    await request.app.state.voice.stop(user["UserId"], str(session_id))
    return Response(status_code=204)
