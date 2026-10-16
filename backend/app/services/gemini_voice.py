"""Owned Gemini audio relay with authoritative transcript storage and limits."""

import asyncio
import base64
import hashlib
import hmac
import json
import secrets
from dataclasses import dataclass, field
from time import monotonic
from uuid import uuid4

from fastapi import HTTPException, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool

from app.core.config import Settings
from app.db.database import Database, Record
from app.llm.base import ContextMessage
from app.llm.gemini_live import GeminiLiveClient
from app.services.realtime import RealtimeManager, VoiceSession, VoiceTurn


@dataclass
class GeminiSession(VoiceSession):
    """Bind a short-lived single-use audio ticket to the REST-authorized owner."""

    ticket_hash: bytes = b""
    browser: WebSocket | None = None
    attached: asyncio.Event = field(default_factory=asyncio.Event)
    prompt: str = ""
    history: list[ContextMessage] = field(default_factory=list)
    current: VoiceTurn | None = None
    completed_turn: VoiceTurn | None = None


class GeminiVoiceManager(RealtimeManager):
    """Reuse ownership, SQL turn finalization, logout and single-worker limits."""

    def __init__(self, settings: Settings, database: Database) -> None:
        """Keep Gemini transport separate from the optional OpenAI implementation."""
        super().__init__(settings, database)
        self.live = GeminiLiveClient(settings)

    async def start(self, user_id: int, identity: int, sdp: str = "") -> Record:
        """Authorize context first; open the provider only after browser attachment."""
        self.live.headers()
        if (
            any(s.user_id == user_id for s in self.sessions.values())
            or len(self.sessions) >= 32
        ):
            raise HTTPException(
                409, "Một phiên thoại đang hoạt động hoặc hệ thống đã đầy."
            )
        ticket = secrets.token_urlsafe(32)
        session = GeminiSession(
            str(uuid4()),
            user_id,
            identity,
            ticket_hash=hashlib.sha256(ticket.encode()).digest(),
        )
        self.sessions[session.session_id] = session
        try:
            session.prompt, session.history = await run_in_threadpool(
                self.conversations.voice_context, user_id, identity
            )
            session.task = asyncio.create_task(self.monitor(session))
            return {
                "session_id": session.session_id,
                "transport": "websocket",
                "ticket": ticket,
            }
        except BaseException:
            await self.cleanup(session)
            raise

    async def attach_browser(
        self, identity: str, ticket: str, browser: WebSocket
    ) -> None:
        """Consume the ticket once, without putting bearer credentials in URLs/logs."""
        session = self.sessions.get(identity)
        if (
            not isinstance(session, GeminiSession)
            or session.browser is not None
            or monotonic() - session.started > 10
            or not session.ticket_hash
            or not hmac.compare_digest(
                session.ticket_hash, hashlib.sha256(ticket.encode()).digest()
            )
        ):
            await browser.close(code=4404)
            return
        session.ticket_hash = b""
        session.browser = browser
        session.attached.set()
        if session.task:
            await asyncio.gather(session.task, return_exceptions=True)

    async def emit(self, session: GeminiSession, event: Record) -> None:
        """Serialize relay messages through the owning browser connection."""
        assert session.browser is not None
        await session.browser.send_json(event)

    async def receive_audio(self, session: GeminiSession) -> None:
        """Accept bounded PCM only; never accept client instructions/transcripts."""
        assert session.browser is not None and session.socket is not None
        budget = 64000.0
        previous = monotonic()
        while True:
            raw = await session.browser.receive_text()
            if len(raw) > 12000:
                raise ValueError("Oversized audio message")
            data = json.loads(raw)
            now = monotonic()
            budget = min(64000, budget + (now - previous) * 32000)
            previous = now
            if data == {"audio_end": True}:
                budget -= 3200
                if budget < 0:
                    raise ValueError("Audio control rate exceeded")
                await self.live.audio(session.socket, None)
                continue
            if not isinstance(data, dict) or set(data) != {"audio"}:
                raise ValueError("Only PCM audio is accepted")
            encoded = data["audio"]
            if not isinstance(encoded, str):
                raise ValueError("Invalid audio encoding")
            pcm = base64.b64decode(encoded, validate=True)
            budget -= max(320, len(pcm))
            if not pcm or len(pcm) % 2 or len(pcm) > 8192 or budget < 0:
                raise ValueError("Invalid audio size or rate")
            await self.live.audio(session.socket, encoded)

    async def provider_event(self, session: GeminiSession, event: Record) -> None:
        """Only Gemini-origin text may be persisted; clear queued audio on barge-in."""
        if "error" in event or "goAway" in event:
            raise ValueError("Gemini Live unavailable")
        content = event.get("serverContent")
        if not content:
            return
        if content.get("interrupted"):
            turn = session.current or session.completed_turn
            if turn:
                turn.interrupted = True
                if turn.finalized and turn.stored:
                    await run_in_threadpool(
                        self.conversations.discard_reply, session.user_id, turn.stored
                    )
                else:
                    await self.settle(session, turn)
            session.current = session.completed_turn = None
            await self.emit(session, {"type": "interrupted"})
            # Interruption and new input can arrive in the same provider message.
        if any(
            content.get(k)
            for k in ("inputTranscription", "outputTranscription", "modelTurn")
        ):
            if session.current is None:
                session.current = VoiceTurn(str(uuid4()))
                session.turns[session.current.item_id] = session.current
            turn = session.current
            for key, role in (
                ("inputTranscription", "user"),
                ("outputTranscription", "assistant"),
            ):
                delta = content.get(key, {}).get("text", "")
                if not isinstance(delta, str):
                    raise ValueError("Invalid Gemini transcript")
                if delta:
                    if role == "user":
                        turn.transcript += delta
                        if len(turn.transcript.encode("utf-16-le")) > 4000:
                            raise ValueError("Input transcript too large")
                        text = turn.transcript
                    else:
                        turn.result += delta
                        if len(turn.result) > 12000:
                            raise ValueError("Output transcript too large")
                        text = turn.result
                    await self.emit(
                        session, {"type": "transcript", "role": role, "text": text}
                    )
            for part in content.get("modelTurn", {}).get("parts", []):
                audio = part.get("inlineData")
                if audio:
                    if audio.get("mimeType") not in (
                        "audio/pcm;rate=24000",
                        "audio/pcm;rate=24000;channels=1",
                    ):
                        raise ValueError("Unexpected audio format")
                    decoded = base64.b64decode(audio["data"], validate=True)
                    if not decoded or len(decoded) % 2 or len(decoded) > 131072:
                        raise ValueError("Invalid provider audio")
                    await self.emit(session, {"type": "audio", "data": audio["data"]})
        if (
            content.get("turnComplete")
            and not content.get("interrupted")
            and session.current
        ):
            turn = session.current
            # Missing input cannot safely be attributed to a user turn. Fail closed.
            if not turn.transcript.strip():
                raise ValueError("Missing authoritative input transcript")
            turn.status = "completed"
            await self.settle(session, turn)
            session.completed_turn, session.current = turn, None
            await self.emit(session, {"type": "done"})
        if len(session.turns) > 200:
            raise ValueError("Session turn limit exceeded")

    async def receive_provider(self, session: GeminiSession) -> None:
        """Monitor lease/duration even when the provider has no audio events."""
        assert session.socket is not None
        while monotonic() - session.started < self.settings.voice_max_session_seconds:
            if monotonic() - session.heartbeat > 35:
                return
            try:
                raw = await asyncio.wait_for(session.socket.recv(), 5)
            except TimeoutError:
                continue
            await self.provider_event(session, json.loads(raw))

    async def monitor(self, session: VoiceSession) -> None:
        """Own both directions and close the upstream when either end disconnects."""
        assert isinstance(session, GeminiSession)
        tasks: list[asyncio.Task[None]] = []
        try:
            await asyncio.wait_for(session.attached.wait(), 10)
            session.socket = await self.live.open(session.prompt, session.history)
            session.prompt, session.history = "", []
            session.state = "listening"
            await self.emit(session, {"type": "ready"})
            tasks = [
                asyncio.create_task(self.receive_audio(session)),
                asyncio.create_task(self.receive_provider(session)),
            ]
            done, _ = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            for task in done:
                task.result()
        except asyncio.CancelledError:
            raise
        except WebSocketDisconnect:
            pass
        except Exception:
            session.error = (
                "Gemini Live chưa kết nối được hoặc bị gián đoạn. "
                "Kiểm tra model/quota và thử lại."
            )
            if session.browser:
                try:
                    await self.emit(
                        session, {"type": "error", "message": session.error}
                    )
                except (RuntimeError, WebSocketDisconnect):
                    pass
        finally:
            for task in tasks:
                task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
            await self.cleanup(session)

    async def cleanup(self, session: VoiceSession) -> None:
        """Always close both sockets, cancel pending turns and release the slot."""
        if session.closing:
            return
        session.closing = True
        session.state = "closed"
        try:
            if session.socket:
                await session.socket.close()
                session.socket = None
        except Exception:
            session.error = "Chưa xác nhận được việc đóng kết nối Gemini."
        finally:
            try:
                if isinstance(session, GeminiSession):
                    session.ticket_hash = b""
                    if session.browser:
                        try:
                            await session.browser.close()
                        except (RuntimeError, WebSocketDisconnect):
                            pass
                for turn in session.turns.values():
                    if not turn.finalized:
                        turn.interrupted = True
                        await self.settle(session, turn)
            except Exception:
                session.error = "Đã đóng phiên nhưng chưa lưu đầy đủ lịch sử."
            finally:
                self.sessions.pop(session.session_id, None)
