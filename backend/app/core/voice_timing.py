"""Content-free, opt-in timing spans correlated by a validated voice trace UUID."""

import logging
from contextvars import ContextVar
from time import perf_counter
from uuid import UUID, uuid4

from starlette.datastructures import QueryParams
from starlette.types import ASGIApp, Receive, Scope, Send

voice_trace: ContextVar[str | None] = ContextVar("voice_trace", default=None)
logger = logging.getLogger("engmate.voice.latency")


class VoiceTimings:
    """Log first occurrences relative to a local monotonic span, without payloads."""

    def __init__(self) -> None:
        """Snapshot the request trace before any asynchronous provider work."""
        self.trace = voice_trace.get()
        self.span = str(uuid4()) if self.trace is not None else None
        self.started = perf_counter()
        self.marked: set[str] = set()

    def mark(self, stage: str) -> None:
        """Emit only static stage labels and numeric durations for traced requests."""
        if self.trace is None or stage in self.marked:
            return
        self.marked.add(stage)
        logger.info(
            "voice_stage trace_id=%s span_id=%s stage=%s elapsed_ms=%.2f",
            self.trace,
            self.span,
            stage,
            (perf_counter() - self.started) * 1000,
        )

    def count(self, metric: str, value: object) -> None:
        """Log numeric provider usage only, never headers, content or raw metadata."""
        if self.trace is not None and type(value) is int and value >= 0:
            logger.info(
                "voice_count trace_id=%s span_id=%s metric=%s value=%d",
                self.trace,
                self.span,
                metric,
                value,
            )


class VoiceTimingMiddleware:
    """Keep timing context alive through SSE bodies without changing authorization."""

    def __init__(self, app: ASGIApp) -> None:
        """Wrap ASGI without buffering request or response data."""
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """Accept only UUID correlation values; never log raw query parameters."""
        trace = None
        if scope["type"] == "http":
            raw = QueryParams(scope.get("query_string", b"")).get("voice_trace_id")
            if raw is not None:
                try:
                    trace = str(UUID(raw))
                except ValueError:
                    pass
        token = voice_trace.set(trace)
        try:
            await self.app(scope, receive, send)
        finally:
            voice_trace.reset(token)
