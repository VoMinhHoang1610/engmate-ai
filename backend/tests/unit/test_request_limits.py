"""HTTP safeguards work with declared and streamed request bodies."""

from collections.abc import AsyncIterator

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from pydantic import SecretStr

from app.core.config import Settings
from app.core.request_limits import MAX_BODY, AuthLimiter
from app.main import create_app

pytestmark = pytest.mark.anyio


async def test_no_database_mode(client: AsyncClient, application: FastAPI) -> None:
    """The mock demo remains runnable; persisted routes report missing configuration."""
    assert (await client.get("/api/health")).status_code == 200
    assert (await client.get("/api/ready")).status_code == 503
    assert (await client.get("/api/me")).status_code == 401
    application.state.settings.jwt_secret = SecretStr(
        "isolated-test-signing-secret-at-least-32-characters"
    )
    assert (
        await client.get(
            "/api/conversations/0/messages", headers={"Authorization": "Bearer invalid"}
        )
    ).status_code in (401, 422)


async def test_rate_limit_and_private_validation() -> None:
    """Throttle authentication and never echo passwords/tokens in error details."""
    app = create_app(Settings(auth_requests_per_minute=2))
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        body = {
            "username": "a",
            "email": "invalid",
            "password": "sensitive-test-value",
            "display_name": "Name",
        }
        response = await client.post("/api/auth/register", json=body)
        assert response.status_code == 422
        assert body["password"] not in response.text
        assert response.headers["cache-control"] == "no-store"
        assert (await client.post("/api/auth/register", json=body)).status_code == 422
        limited = await client.post("/api/auth/register", json=body)
        assert limited.status_code == 429
        assert limited.headers["retry-after"] == "60"
        assert (await client.get("/api/health")).status_code == 200


async def test_body_limit(client: AsyncClient) -> None:
    """Reject oversize declared and chunked bodies before creating any data."""
    declared = await client.post(
        "/api/auth/login", content=b"{}", headers={"Content-Length": str(MAX_BODY + 1)}
    )
    assert declared.status_code == 413

    async def chunks() -> AsyncIterator[bytes]:
        """Deliver a body without Content-Length."""
        yield b"x" * (MAX_BODY + 1)

    streamed = await client.post(
        "/api/auth/login",
        content=chunks(),
        headers={"Content-Type": "application/json"},
    )
    assert streamed.status_code == 413


def test_limiter_expiry(monkeypatch: pytest.MonkeyPatch) -> None:
    """A peer can retry after the rolling window and storage remains bounded."""
    monkeypatch.setattr("app.core.request_limits.monotonic", lambda: 0.0)
    limiter = AuthLimiter(1)
    assert limiter.allow("peer")
    assert not limiter.allow("peer")
    monkeypatch.setattr("app.core.request_limits.monotonic", lambda: 61.0)
    assert limiter.allow("peer")
    for index in range(4100):
        limiter.allow(str(index))
    assert len(limiter.clients) == 4096
