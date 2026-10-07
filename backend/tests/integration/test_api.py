"""Check observable HTTP contracts and error paths."""

import pytest
from fastapi import FastAPI
from httpx import AsyncClient

from app.api.dependencies import get_ai_service
from app.schemas.ai import ReplyRequest, ReplyResponse

pytestmark = pytest.mark.anyio


async def test_health(client: AsyncClient) -> None:
    """The liveness payload stays stable."""
    response = await client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "engmate-ai"}


@pytest.mark.parametrize("level", ["Pre-A1", "A1", "A2", "B1", "B2", "C1", "C2"])
async def test_mock_reply(client: AsyncClient, level: str) -> None:
    """The mock accepts all supported levels and identifies its output."""
    response = await client.post(
        "/api/ai/reply", json={"message": " Hello ", "level": level}
    )
    assert response.status_code == 200
    assert response.json() == {
        "reply": f"[Mock/{level}] You said: Hello. What would you like to practice?",
        "provider": "mock",
        "level": level,
    }


@pytest.mark.parametrize(
    "payload",
    [
        {"message": ""},
        {"message": "   "},
        {"message": "x" * 2001},
        {"message": "Hello", "level": "C3"},
        {"message": "Hello", "level": "A0"},
        {"message": "Hello", "extra": True},
        {},
    ],
)
async def test_invalid_reply_input(
    client: AsyncClient, payload: dict[str, object]
) -> None:
    """Reject invalid input before the provider is called."""
    response = await client.post("/api/ai/reply", json=payload)
    assert response.status_code == 422


async def test_timeout(client: AsyncClient, application: FastAPI) -> None:
    """A provider timeout has a safe HTTP response."""

    class TimeoutService:
        """Replace the provider with a failing test adapter."""

        async def reply(self, request: ReplyRequest) -> ReplyResponse:
            """Simulate a timeout without external network calls."""
            raise TimeoutError("private provider details")

    application.dependency_overrides[get_ai_service] = TimeoutService
    response = await client.post("/api/ai/reply", json={"message": "Hello"})
    assert response.status_code == 504
    assert response.json() == {"detail": "AI provider timed out."}


async def test_cors(client: AsyncClient) -> None:
    """Only configured browser origins receive permission."""
    response = await client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5174",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5174"
    denied = await client.options(
        "/api/health",
        headers={
            "Origin": "https://untrusted.example",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert denied.status_code == 400


async def test_openapi(client: AsyncClient) -> None:
    """Both starter endpoints appear in the generated contract."""
    response = await client.get("/openapi.json")
    schema = response.json()
    assert "/api/health" in schema["paths"]
    assert "/api/ai/reply" in schema["paths"]
