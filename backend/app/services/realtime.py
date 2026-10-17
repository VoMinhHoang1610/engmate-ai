"""Authenticated WebRTC signaling and authoritative Realtime conversation storage."""

import asyncio
import json
import logging
from dataclasses import dataclass, field
from time import monotonic
from uuid import NAMESPACE_URL, uuid4, uuid5

from fastapi import HTTPException
from fastapi.concurrency import run_in_threadpool
from websockets.asyncio.client import ClientConnection

from app.core.config import Settings
from app.db.database import Database, Record
from app.llm.realtime import OpenAIRealtimeClient
from app.schemas.chat import MessageCreate
from app.services.conversations import ConversationService, PendingTurn

LOGGER = logging.getLogger(__name__)


@dataclass
class VoiceTurn:
    """Associate provider input/output IDs even when transcription arrives late."""

    item_id: str
    transcript: str = ""
    response_id: str = ""
    output_item_id: str = ""
    result: str = ""
    status: str = "pending"
    interrupted: bool = False
    stored: PendingTurn | None = None
    finalized: bool = False
    started: float = field(default_factory=monotonic)


@dataclass
class VoiceSession:
    """One bounded live call; never accept client-supplied assistant transcripts."""

    session_id: str
    user_id: int
    conversation_id: int
    call_id: str = ""
    socket: ClientConnection | None = None
    task: asyncio.Task[None] | None = None
    turns: dict[str, VoiceTurn] = field(default_factory=dict)
    current_input: str = ""
    active_response: str = ""
    state: str = "connecting"
    heartbeat: float = field(default_factory=monotonic)
    started: float = field(default_factory=monotonic)
    error: str | None = None
    closing: bool = False


class RealtimeManager:
    """Single-worker session ownership, limits, sideband events and cleanup."""

    def __init__(self, settings: Settings, database: Database) -> None:
        """Use the same conversation service/prompt/context as text chat."""
        self.settings = settings
        self.provider = OpenAIRealtimeClient(settings)
        self.conversations = ConversationService(database)
        self.sessions: dict[str, VoiceSession] = {}

    def ensure_text_available(self, user_id: int, identity: int) -> None:
        """Prevent text and voice from generating overlapping conversation turns."""
        if any(
            s.user_id == user_id and s.conversation_id == identity
            for s in self.sessions.values()
        ):
            raise HTTPException(409, "End the voice session before sending text.")

    def owned(self, user_id: int, session_id: str) -> VoiceSession:
        """Resolve only the caller's opaque application session identity."""
        session = self.sessions.get(session_id)
        if not session or session.user_id != user_id:
            raise HTTPException(404, "Voice session not found.")
        return session

    def headers(self) -> dict[str, str]:
        """Check private provider readiness before reserving a call slot."""
        return self.provider.headers()

    async def start(self, user_id: int, identity: int, sdp: str) -> Record:
        """Attach sideband before returning the SDP answer to the browser."""
        self.headers()
        if (
            any(s.user_id == user_id for s in self.sessions.values())
            or len(self.sessions) >= 32
        ):
            raise HTTPException(
                409, "A voice session is already active or capacity is full."
            )
        session = VoiceSession(str(uuid4()), user_id, identity)
        # Reserve before the first await so concurrent starts cannot create two calls.
        self.sessions[session.session_id] = session
        try:
            prompt, history = await run_in_threadpool(
                self.conversations.voice_context, user_id, identity
            )
            answer, session.call_id = await self.provider.create(sdp, prompt)
            session.socket = await self.provider.attach(session.call_id)
            # Restore role-typed history on the trusted sideband.
            for message in history:
                kind = "input_text" if message["role"] == "user" else "text"
                await session.socket.send(
                    json.dumps(
                        {
                            "type": "conversation.item.create",
                            "item": {
                                "type": "message",
                                "role": message["role"],
                                "content": [{"type": kind, "text": message["content"]}],
                            },
                        }
                    )
                )
            session.state = "listening"
            session.task = asyncio.create_task(self.monitor(session))
            return {"session_id": session.session_id, "sdp": answer}
        except BaseException as error:
            await self.cleanup(session)
            if isinstance(error, (HTTPException, asyncio.CancelledError)):
                raise
            raise HTTPException(502, "Could not connect to OpenAI Realtime.") from None

    async def settle(self, session: VoiceSession, turn: VoiceTurn) -> None:
        """Reserve/finalize once despite out-of-order transcript events."""
        if turn.finalized or not turn.transcript:
            return
        if turn.stored is None:
            data = MessageCreate(
                client_request_id=uuid5(
                    NAMESPACE_URL, session.session_id + turn.item_id
                ),
                message=turn.transcript,
            )
            pending = await run_in_threadpool(
                self.conversations.prepare,
                session.user_id,
                session.conversation_id,
                data,
            )
            if not isinstance(pending, PendingTurn):
                turn.finalized = True
                return
            turn.stored = pending
        if turn.status == "pending" and not turn.interrupted:
            return
        status = "cancelled" if turn.interrupted else turn.status
        if status == "completed" and not turn.result.strip():
            status = "failed"
        latency_ms = int((monotonic() - turn.started) * 1000)
        await run_in_threadpool(
            self.conversations.finalize,
            session.user_id,
            turn.stored,
            status,
            turn.result[:12000] if status == "completed" else None,
            latency_ms,
        )
        turn.finalized = True
        LOGGER.debug(
            "voice_turn_finalized",
            extra={
                "response_id": turn.response_id,
                "latency_ms": latency_ms,
                "status": status,
            },
        )

    async def event(self, session: VoiceSession, event: Record) -> None:
        """Persist only provider-confirmed transcripts; reject late cancelled output."""
        kind = event.get("type")
        if kind == "input_audio_buffer.speech_started":
            session.state = "user_speaking"
            for turn in session.turns.values():
                if turn.response_id == session.active_response:
                    turn.interrupted = True
                    await self.settle(session, turn)
            session.active_response = ""
        elif kind == "input_audio_buffer.committed":
            item_id = str(event["item_id"])
            session.current_input = item_id
            session.turns.setdefault(item_id, VoiceTurn(item_id))
        elif kind == "conversation.item.input_audio_transcription.completed":
            item_id = str(event["item_id"])
            turn = session.turns.setdefault(item_id, VoiceTurn(item_id))
            transcript = event.get("transcript")
            if (
                not isinstance(transcript, str)
                or len(transcript.encode("utf-16-le")) > 4000
            ):
                raise ValueError("Invalid provider transcript")
            turn.transcript = transcript
            await self.settle(session, turn)
        elif kind == "response.created":
            if session.current_input:
                turn = session.turns[session.current_input]
                turn.response_id = str(event["response"]["id"])
                session.active_response = turn.response_id
                session.state = "processing"
        elif kind == "response.done":
            response = event["response"]
            for turn in session.turns.values():
                if turn.response_id != response["id"]:
                    continue
                output = response.get("output", [])
                turn.output_item_id = str(output[0].get("id", "")) if output else ""
                turn.result = "".join(
                    str(part.get("transcript", part.get("text", "")))
                    for item in output
                    for part in item.get("content", [])
                )
                turn.status = (
                    "completed"
                    if response.get("status") == "completed"
                    else (
                        "cancelled"
                        if response.get("status") == "cancelled"
                        else "failed"
                    )
                )
                await self.settle(session, turn)
        elif kind == "response.output_item.added":
            for turn in session.turns.values():
                if turn.response_id == event.get("response_id"):
                    turn.output_item_id = str(event["item"]["id"])
        elif kind == "conversation.item.truncated":
            for turn in session.turns.values():
                if turn.output_item_id == event.get("item_id"):
                    turn.interrupted = True
                    if turn.stored:
                        await run_in_threadpool(
                            self.conversations.discard_reply,
                            session.user_id,
                            turn.stored,
                        )
        elif (
            kind == "error"
            or kind == "conversation.item.input_audio_transcription.failed"
        ):
            raise ValueError("Realtime provider error")

    async def monitor(self, session: VoiceSession) -> None:
        """Bound duration and stop calls when authoritative sideband is lost."""
        try:
            assert session.socket is not None
            while (
                monotonic() - session.started < self.settings.voice_max_session_seconds
            ):
                if monotonic() - session.heartbeat > 35:
                    break
                try:
                    raw = await asyncio.wait_for(session.socket.recv(), timeout=5)
                except TimeoutError:
                    continue
                await self.event(session, json.loads(raw))
                if len(session.turns) > 200:
                    break
        except asyncio.CancelledError:
            raise
        except Exception:
            session.error = "Phiên thoại bị gián đoạn; hãy kết nối lại."
        finally:
            await self.cleanup(session)

    async def cleanup(self, session: VoiceSession) -> None:
        """Stop upstream resources and leave no pending turn after disconnect/end."""
        if session.closing:
            return
        session.closing = True
        session.state = "closed"
        try:
            if session.socket:
                await session.socket.close()
                session.socket = None
            for turn in session.turns.values():
                if not turn.finalized:
                    turn.interrupted = True
                    await self.settle(session, turn)
        except Exception:
            session.error = "Đã ngắt phiên thoại nhưng chưa lưu đầy đủ lịch sử."
        finally:
            if session.call_id:
                call_id, session.call_id = session.call_id, ""
                if not await self.provider.hangup(call_id):
                    session.error = "Không xác nhận được việc đóng phiên upstream."
            self.sessions.pop(session.session_id, None)

    async def stop(self, user_id: int, session_id: str) -> None:
        """End only an owned session and await all cleanup before acknowledging."""
        if session_id not in self.sessions:
            return
        session = self.owned(user_id, session_id)
        if session.task:
            if not session.closing:
                session.task.cancel()
            await asyncio.gather(session.task, return_exceptions=True)
        else:
            await self.cleanup(session)
        if session.error:
            raise HTTPException(502, session.error)

    async def shutdown(self, user_id: int | None = None) -> None:
        """Stop app-owned calls during logout or server shutdown."""
        for session in list(self.sessions.values()):
            if user_id is None or session.user_id == user_id:
                try:
                    await self.stop(session.user_id, session.session_id)
                except HTTPException:
                    # Local cleanup completed; upstream closure remains uncertain.
                    continue
