"""Bounded, ticketed Blaze STT relay; provider credentials never reach browsers."""

import asyncio
import hashlib
import hmac
import json
import logging
import secrets
from dataclasses import dataclass
from time import monotonic
from typing import Literal
from uuid import uuid4

from fastapi import HTTPException, WebSocket, WebSocketDisconnect
from websockets.asyncio.client import ClientConnection, connect
from websockets.exceptions import ConnectionClosed, InvalidStatus

from app.core.config import Settings
from app.core.voice_timing import VoiceTimings, voice_trace

FRAME_BYTES = 3200  # 100 ms PCM16 mono, 16 kHz.
MAX_FRAMES = 350  # 30 seconds of capture plus at most 5 seconds of finalization.

ERROR_MESSAGES = {
    "provider_auth": "Blaze từ chối xác thực STT. Kiểm tra API key trên backend.",
    "insufficient_credits": "Tài khoản Blaze không đủ credit để nhận dạng giọng nói.",
    "invoice_not_paid": "Blaze yêu cầu thanh toán hóa đơn trước khi dùng STT.",
    "subscription_missing": "Tài khoản Blaze chưa có gói dịch vụ STT realtime.",
    "plan_upgrade_required": "Gói Blaze hiện tại chưa hỗ trợ STT realtime.",
    "provider_rate_limited": "Blaze đang giới hạn lượt STT. Hãy thử lại sau.",
    "provider_error": (
        "Blaze báo lỗi dịch vụ STT. Hãy thử lại hoặc kiểm tra dịch vụ Blaze."
    ),
    "provider_timeout": "Blaze STT phản hồi quá thời gian. Hãy thử lại.",
    "provider_unavailable": "Kết nối tới Blaze STT bị gián đoạn. Hãy thử lại.",
    "protocol_error": (
        "Phản hồi Blaze STT không đúng giao thức. Kiểm tra phiên bản backend."
    ),
    "audio_limit": "Audio STT vượt giới hạn kích thước, tốc độ hoặc thời lượng.",
    "transcript_limit": "Bản chép lời vượt giới hạn. Hãy nói thành các lượt ngắn hơn.",
}
PROVIDER_ERRORS = {
    "insufficient-credits": "insufficient_credits",
    "invoice-not-paid": "invoice_not_paid",
    "subscription-not-found": "subscription_missing",
    "plan-upgrade-required": "plan_upgrade_required",
}
error_logger = logging.getLogger("engmate.blaze.stt")


class STTError(ValueError):
    """Carry only an application-owned error code, never upstream payload text."""

    def __init__(
        self,
        code: str,
        *,
        reason: Literal[
            "unspecified",
            "frame_size",
            "invalid_json",
            "invalid_envelope",
            "expected_ready",
            "unexpected_stream_event",
            "invalid_text",
            "input_before_ready",
        ] = "unspecified",
    ) -> None:
        """Resolve a safe message from the internal code whitelist."""
        self.code = code
        self.reason = reason
        super().__init__(ERROR_MESSAGES[code])


def provider_event(raw: str | bytes) -> dict[str, object]:
    """Validate documented Blaze events and classify failures before ready/text."""
    if len(raw) > 16384:
        raise STTError("protocol_error", reason="frame_size")
    try:
        data = json.loads(raw)
    except (ValueError, UnicodeError) as exc:
        raise STTError("protocol_error", reason="invalid_json") from exc
    if not isinstance(data, dict) or not isinstance(data.get("type"), str):
        raise STTError("protocol_error", reason="invalid_envelope")
    kind = data["type"]
    if kind in PROVIDER_ERRORS:
        raise STTError(PROVIDER_ERRORS[kind])
    if kind == "error":
        # Exact documented example only; never infer auth from arbitrary text.
        code = (
            "provider_auth"
            if data.get("text") == "Authentication failed"
            else "provider_error"
        )
        raise STTError(code)
    return data


@dataclass
class STTLease:
    """Authorize exactly one bounded utterance, not a reusable provider session."""

    user_id: int
    language: str
    digest: bytes
    created: float
    trace_id: str | None = None
    task: asyncio.Task[None] | None = None


class BlazeSTTManager:
    """Own pending tickets and active relays through logout and app shutdown."""

    def __init__(self, settings: Settings) -> None:
        """Use the existing websocket dependency without a second provider SDK."""
        self.settings = settings
        self.leases: dict[str, STTLease] = {}

    def issue(self, user_id: int, language: str) -> dict[str, str]:
        """Reserve an expiring single-use ticket without calling the provider."""
        if (
            self.settings.voice_provider != "blaze"
            or self.settings.blaze_stt_mode != "realtime"
            or not self.settings.blaze_api_key
        ):
            raise HTTPException(503, "Blaze realtime STT is not enabled.")
        for key, lease in list(self.leases.items()):
            if lease.task is None and monotonic() - lease.created > 10:
                self.leases.pop(key, None)
        # Allow an old cancelling turn and its replacement, never unbounded fan-out.
        if (
            len(self.leases) >= 32
            or sum(lease.user_id == user_id for lease in self.leases.values()) >= 2
        ):
            raise HTTPException(429, "Too many active speech turns.")
        identity, ticket = str(uuid4()), secrets.token_urlsafe(32)
        self.leases[identity] = STTLease(
            user_id,
            language,
            hashlib.sha256(ticket.encode()).digest(),
            monotonic(),
            voice_trace.get(),
        )
        return {"session_id": identity, "ticket": ticket}

    async def open_provider(self, language: str) -> ClientConnection:
        """Authenticate at a fixed origin and require ready before sending PCM."""
        key = self.settings.blaze_api_key
        if key is None:
            raise ValueError("Speech not configured")
        # The init frame contains a secret; never enable websocket frame debug logs.
        logger = logging.getLogger("engmate.blaze.stt.transport")
        logger.setLevel(logging.WARNING)
        socket = await connect(
            "wss://api.blaze.vn/v1/stt/realtime",
            open_timeout=10,
            close_timeout=2,
            max_size=16384,
            max_queue=16,
            proxy=None,
            logger=logger,
        )
        try:
            await socket.send(
                json.dumps(
                    {
                        "token": key.get_secret_value(),
                        "language": language,
                        "model": self.settings.blaze_stt_realtime_model,
                    }
                )
            )
            # Blaze can acknowledge authentication before its STT worker is ready.
            # Keep one shared deadline and allow exactly one acknowledgement;
            # authentication alone must never release the browser's PCM backlog.
            async with asyncio.timeout(10):
                data = provider_event(await socket.recv())
                if data.get("type") == "successful-authentication":
                    data = provider_event(await socket.recv())
                if data.get("type") != "ready":
                    raise STTError("protocol_error", reason="expected_ready")
            return socket
        except BaseException:
            await socket.close()
            raise

    async def relay(self, identity: str, ticket: str, browser: WebSocket) -> None:
        """Consume a ticket once; forward only PCM and validated transcripts."""
        lease = self.leases.get(identity)
        if (
            lease is None
            or lease.task is not None
            or monotonic() - lease.created > 10
            or not lease.digest
            or not hmac.compare_digest(
                lease.digest, hashlib.sha256(ticket.encode()).digest()
            )
        ):
            await browser.close(code=4401)
            return
        lease.digest = b""
        lease.task = asyncio.current_task()
        token = voice_trace.set(lease.trace_id)
        timing = VoiceTimings()
        socket: ClientConnection | None = None
        opening: asyncio.Task[ClientConnection] | None = None
        tasks: list[asyncio.Task[None]] = []
        phase = "setup"
        try:
            async with asyncio.timeout(45):
                # Detect a browser gone away even while upstream setup is waiting.
                opening = asyncio.create_task(self.open_provider(lease.language))
                early = asyncio.create_task(self.watch_setup(browser))
                tasks = [early]
                done, _ = await asyncio.wait(
                    [opening, early], return_when=asyncio.FIRST_COMPLETED
                )
                if opening in done:
                    socket = opening.result()
                if early in done:
                    early.result()
                assert socket is not None
                early.cancel()
                await asyncio.gather(early, return_exceptions=True)
                timing.mark("stt_ready")
                await browser.send_json({"type": "ready"})
                phase = "stream"
                tasks = [
                    asyncio.create_task(self.receive_audio(browser, socket)),
                    asyncio.create_task(self.receive_text(browser, socket, timing)),
                ]
                done, _ = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
                for task in done:
                    task.result()
        except asyncio.CancelledError:
            raise
        except WebSocketDisconnect:
            pass
        except Exception as exc:
            # Provider errors may contain tokens/transcripts; do not echo/log them.
            if isinstance(exc, STTError):
                code = exc.code
            elif isinstance(exc, TimeoutError):
                code = "provider_timeout"
            elif isinstance(exc, InvalidStatus):
                status = exc.response.status_code
                code = (
                    "provider_auth"
                    if status in {401, 403}
                    else (
                        "provider_rate_limited"
                        if status == 429
                        else "provider_unavailable"
                    )
                )
            elif isinstance(exc, (ConnectionClosed, OSError)):
                code = "provider_unavailable"
            else:
                code = "protocol_error"
            error_logger.warning(
                "stt_failure code=%s phase=%s trace_id=%s reason=%s exception=%s",
                code,
                phase,
                lease.trace_id or "none",
                exc.reason if isinstance(exc, STTError) else "unspecified",
                # Names are allowlisted too: never log exception messages/frames.
                (
                    type(exc).__name__
                    if type(exc)
                    in {
                        STTError,
                        ValueError,
                        TypeError,
                        AttributeError,
                        RuntimeError,
                        TimeoutError,
                        InvalidStatus,
                    }
                    else "other"
                ),
            )
            try:
                await browser.send_json(
                    {
                        "type": "error",
                        "code": code,
                        "phase": phase,
                        "message": ERROR_MESSAGES[code],
                    }
                )
            except (RuntimeError, WebSocketDisconnect):
                pass
        finally:
            for task in tasks:
                task.cancel()
            if opening is not None and not opening.done():
                opening.cancel()
            # Close the provider before waiting for child cancellation. A second
            # cancellation can otherwise skip upstream cleanup and leak the socket.
            try:
                if (
                    socket is None
                    and opening is not None
                    and opening.done()
                    and not opening.cancelled()
                    and opening.exception() is None
                ):
                    socket = opening.result()
                if socket is not None:
                    await socket.close()
                await asyncio.gather(*tasks, return_exceptions=True)
                if opening is not None:
                    await asyncio.gather(opening, return_exceptions=True)
                    if (
                        socket is None
                        and not opening.cancelled()
                        and opening.exception() is None
                    ):
                        socket = opening.result()
                        await socket.close()
            finally:
                voice_trace.reset(token)
                self.leases.pop(identity, None)
                try:
                    await browser.close()
                except (RuntimeError, WebSocketDisconnect):
                    pass

    @staticmethod
    async def watch_setup(browser: WebSocket) -> None:
        """Reject pre-ready input or cancel setup immediately on browser disconnect."""
        message = await browser.receive()
        if message["type"] == "websocket.disconnect":
            raise WebSocketDisconnect()
        raise STTError("protocol_error", reason="input_before_ready")

    @staticmethod
    async def receive_audio(browser: WebSocket, socket: ClientConnection) -> None:
        """Bound frame size, total bytes and send rate, including setup backlog."""
        budget, previous = 160000.0, monotonic()
        frames = 0
        while True:
            message = await browser.receive()
            if message["type"] == "websocket.disconnect":
                return
            pcm = message.get("bytes")
            now = monotonic()
            budget = min(160000, budget + (now - previous) * 32000)
            previous = now
            frames += 1
            if (
                not isinstance(pcm, bytes)
                or len(pcm) != FRAME_BYTES
                or frames > MAX_FRAMES
                or budget < FRAME_BYTES
            ):
                raise STTError("audio_limit")
            budget -= FRAME_BYTES
            await socket.send(pcm)

    @staticmethod
    async def receive_text(
        browser: WebSocket, socket: ClientConnection, timing: VoiceTimings | None = None
    ) -> None:
        """Validate text and classify provider errors without exposing raw fields."""
        total = 0
        while True:
            data = provider_event(await socket.recv())
            kind = data.get("type")
            if kind not in ("partial", "final"):
                raise STTError("protocol_error", reason="unexpected_stream_event")
            text = data.get("text")
            if not isinstance(text, str):
                raise STTError("protocol_error", reason="invalid_text")
            if len(text) > 2000:
                raise STTError("transcript_limit")
            if kind == "final":
                total += len(text)
                if total > 2000:
                    raise STTError("transcript_limit")
            if timing is not None:
                timing.mark(
                    "stt_first_partial" if kind == "partial" else "stt_first_final"
                )
            await browser.send_json({"type": kind, "text": text})

    async def shutdown(self, user_id: int | None = None) -> None:
        """Revoke unused tickets and cancel relays on logout or process shutdown."""
        tasks = []
        for key, lease in list(self.leases.items()):
            if user_id is None or lease.user_id == user_id:
                self.leases.pop(key, None)
                if lease.task is not None:
                    lease.task.cancel()
                    tasks.append(lease.task)
        await asyncio.gather(*tasks, return_exceptions=True)
