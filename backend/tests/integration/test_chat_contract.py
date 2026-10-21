"""The public API contains account, chat and speech capabilities only."""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.anyio


async def test_removed_features_are_not_exposed(client: AsyncClient) -> None:
    """Removed learning features must disappear from both routes and OpenAPI."""
    schema = (await client.get("/openapi.json")).json()
    for prefix in (
        "/api/lessons",
        "/api/topics",
        "/api/practice",
        "/api/vocabulary",
        "/api/flashcards",
        "/api/dashboard",
        "/api/media",
    ):
        assert not any(path.startswith(prefix) for path in schema["paths"])
        assert (await client.get(prefix)).status_code == 404


async def test_capabilities_do_not_claim_native_realtime(client: AsyncClient) -> None:
    """A missing Blaze Chat/Voice Agent contract never becomes a fake capability."""
    response = await client.get("/api/capabilities")
    assert response.status_code == 200
    assert response.json()["realtime"] is False
    assert response.json()["provider"] == "gemini"
    assert response.json()["is_mock"] is False
    assert response.json()["chat"] is False
    assert response.json()["streaming"] is False


async def test_auth_requires_a_real_session(client: AsyncClient) -> None:
    """Private conversation resources never fall back to local demo accounts."""
    for path in (
        "/api/me",
        "/api/me/profile",
        "/api/me/avatar",
        "/api/conversations",
        "/api/conversations/1/messages",
    ):
        assert (await client.get(path)).status_code == 401
