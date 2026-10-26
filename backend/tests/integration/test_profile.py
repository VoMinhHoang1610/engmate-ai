"""Profile persistence, ownership and private avatars on a rollback-only schema."""

from pathlib import Path

import pytest
from httpx import AsyncClient

from app.db.database import Database
from tests.integration.test_chat_database import chat_client, database, register

pytestmark = pytest.mark.anyio
__all__ = ["chat_client", "database"]


async def test_profile_roundtrip_and_conflict(chat_client: AsyncClient) -> None:
    """Save all old profile fields and reject stale or forged account edits."""
    await register(chat_client)
    response = await chat_client.get("/api/me/profile")
    assert response.status_code == 200
    before = response.json()
    assert before["display_name"] == "Test"
    assert before["has_avatar"] is False
    assert "user_id" not in before
    data = {
        "version": before["version"],
        "display_name": "  Mai Nguyen  ",
        "phone_number": "+84 901 234 567",
        "birth_date": "2000-01-02",
        "gender": "female",
        "cefr_level": "B1",
        "learning_goal": "Tiếng Anh công việc",
        "daily_goal_minutes": 35,
        "time_zone_id": before["time_zone_id"],
    }
    response = await chat_client.put("/api/me/profile", json=data)
    assert response.status_code == 200, response.text
    saved = response.json()
    assert saved["display_name"] == "Mai Nguyen"
    assert saved["version"] != before["version"]
    assert saved["daily_goal_minutes"] == 35
    assert saved["birth_date"] == "2000-01-02"
    assert saved["cefr_level"] == "B1"
    assert (await chat_client.get("/api/me/profile")).json() == saved
    assert (await chat_client.put("/api/me/profile", json=data)).status_code == 409
    data["version"] = saved["version"]
    assert (
        await chat_client.put("/api/me/profile", json={**data, "user_id": 999})
    ).status_code == 422
    assert (
        await chat_client.put(
            "/api/me/profile", json={**data, "email": "other@example.test"}
        )
    ).status_code == 422
    for field, value in (
        ("display_name", " "),
        ("birth_date", "2999-01-01"),
        ("phone_number", "<script>"),
        ("time_zone_id", "Unknown/Zone"),
        ("daily_goal_minutes", 100),
        ("cefr_level", "C9"),
    ):
        assert (
            await chat_client.put("/api/me/profile", json={**data, field: value})
        ).status_code == 422


async def test_profile_and_avatar_are_owned(
    chat_client: AsyncClient, database: Database, tmp_path: Path
) -> None:
    """An authenticated user cannot read another user's profile or avatar."""
    database.settings.avatar_storage_dir = tmp_path
    await register(chat_client, "first")
    first = dict(chat_client.headers)
    # A small raster fixture; production browser re-encodes selected images.
    image = b"\x89PNG\r\n\x1a\n" + b"\x00\x00\x00\rIHDR" + (1).to_bytes(4, "big") * 2
    assert (await chat_client.get("/api/me/avatar")).status_code == 404
    assert (
        await chat_client.post(
            "/api/me/avatar", files={"file": ("avatar.png", image, "image/png")}
        )
    ).status_code == 204
    response = await chat_client.get("/api/me/avatar")
    assert response.content == image
    assert response.headers["content-type"] == "image/png"
    assert "no-store" in response.headers["cache-control"]
    assert response.headers["x-content-type-options"] == "nosniff"
    assert (await chat_client.get("/api/me/profile")).json()["has_avatar"] is True
    await register(chat_client, "second")
    assert (await chat_client.get("/api/me/profile")).json()["has_avatar"] is False
    assert (await chat_client.get("/api/me/avatar")).status_code == 404
    bad = await chat_client.post(
        "/api/me/avatar",
        files={"file": ("avatar.svg", b"<svg onload='alert(1)'/>", "image/png")},
    )
    assert bad.status_code == 422
    assert (
        await chat_client.post(
            "/api/me/avatar",
            files={"file": ("big.png", b"x" * (2 * 1024 * 1024 + 1), "image/png")},
        )
    ).status_code == 413
    chat_client.headers.clear()
    assert (await chat_client.get("/api/me/profile")).status_code == 401
    assert (await chat_client.get("/api/me/avatar")).status_code == 401
    chat_client.headers.update(first)
    assert (await chat_client.get("/api/me/avatar")).content == image
