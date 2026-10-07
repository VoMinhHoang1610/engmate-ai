"""Bound request bodies and authentication work before processing private data."""

from collections import OrderedDict, deque
from threading import Lock
from time import monotonic

from fastapi import HTTPException
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

MAX_BODY = 10 * 1024 * 1024


class AuthLimiter:
    """Limit authentication requests per peer per process with bounded memory."""

    def __init__(self, limit: int) -> None:
        """Keep only the most recent minute for at most 4096 distinct clients."""
        self.limit = limit
        self.clients: OrderedDict[str, deque[float]] = OrderedDict()
        self.lock = Lock()

    def allow(self, peer: str) -> bool:
        """Use a monotonic clock; do not trust forwarded headers in this layer."""
        timestamp = monotonic()
        with self.lock:
            events = self.clients.setdefault(peer, deque())
            self.clients.move_to_end(peer)
            while events and events[0] <= timestamp - 60:
                events.popleft()
            while len(self.clients) > 4096:
                self.clients.popitem(last=False)
            if len(events) >= self.limit:
                return False
            events.append(timestamp)
            return True


class RequestLimits:
    """Apply the same size limit to declared and streamed bodies without buffering."""

    def __init__(self, app: ASGIApp, auth_limit: int) -> None:
        """Initialize limits independently for each app/test instance."""
        self.app = app
        self.limiter = AuthLimiter(auth_limit)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """Reject oversized/auth floods and disable caching of API responses."""
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        headers = dict(scope["headers"])
        try:
            size = int(headers.get(b"content-length", b"0"))
        except ValueError:
            size = MAX_BODY + 1
        if size < 0 or size > MAX_BODY:
            await JSONResponse(
                {"detail": "Request body exceeds 10 MiB."}, status_code=413
            )(scope, receive, send)
            return
        if scope["path"].startswith("/api/auth/") and scope["method"] == "POST":
            peer = scope.get("client") or ("unknown", 0)
            if not self.limiter.allow(str(peer[0])):
                await JSONResponse(
                    {"detail": "Too many auth requests; try again in one minute."},
                    status_code=429,
                    headers={"Retry-After": "60", "Cache-Control": "no-store"},
                )(scope, receive, send)
                return
        consumed = 0

        async def bounded_receive() -> Message:
            """Bound chunked uploads without trusting Content-Length."""
            nonlocal consumed
            message = await receive()
            consumed += len(message.get("body", b""))
            if consumed > MAX_BODY:
                raise HTTPException(413, "Request body exceeds 10 MiB.")
            return message

        async def private_send(message: Message) -> None:
            """Prevent browser/proxy caching of tokens and owned learning data."""
            if message["type"] == "http.response.start" and scope["path"].startswith(
                "/api/"
            ):
                message["headers"] = [
                    *message.get("headers", []),
                    (b"cache-control", b"no-store"),
                ]
            await send(message)

        await self.app(scope, bounded_receive, private_send)
