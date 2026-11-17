"""Keep removed APIs absent and explicitly bound the approved vocabulary slice."""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.anyio


async def test_removed_features_are_not_exposed(client: AsyncClient) -> None:
    """Legacy learning APIs stay removed; authored vocabulary is explicitly allowed."""
    schema = (await client.get("/openapi.json")).json()
    for prefix in (
        "/api/lessons",
        "/api/topics",
        "/api/practice",
        "/api/flashcards",
        "/api/dashboard",
        "/api/media",
    ):
        assert not any(path.startswith(prefix) for path in schema["paths"])
        assert (await client.get(prefix)).status_code == 404

    vocabulary_paths = {
        path: set(operations)
        for path, operations in schema["paths"].items()
        if path.startswith("/api/vocabulary")
    }
    assert vocabulary_paths == {
        "/api/vocabulary/topics": {"get"},
        "/api/vocabulary/topics/{topic_id}": {"get"},
        "/api/vocabulary/me/states": {"get"},
        "/api/vocabulary/topics/{topic_id}/words/{word_id}/state": {"put"},
        "/api/vocabulary/me/import-legacy": {"post"},
    }
    assert (await client.get("/api/vocabulary")).status_code == 404


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
        "/api/vocabulary/topics",
        "/api/vocabulary/topics/food-and-drink",
        "/api/vocabulary/me/states",
    ):
        assert (await client.get(path)).status_code == 401
