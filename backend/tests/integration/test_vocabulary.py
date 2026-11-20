"""Real MySQL state isolation, optimistic versions and confirmed import receipts."""

import os
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import uuid4

import pytest
from httpx import AsyncClient
from pydantic import SecretStr
from sqlalchemy import inspect, select, text
from sqlalchemy.engine import make_url

from app.core.config import Settings
from app.db.database import Database
from app.db.repository import Repository
from app.db.vocabulary import generation_jobs, metadata, requests, word_states
from app.schemas.vocabulary import WordStateUpdate
from app.services.vocabulary import VocabularyService
from tests.integration.test_chat_database import chat_client, database, register

__all__ = ["chat_client", "database"]
pytestmark = pytest.mark.anyio


async def test_owned_states_replay_and_version_conflicts(
    chat_client: AsyncClient,
) -> None:
    """A failed retry cannot duplicate writes or overwrite another device's state."""
    first = await register(chat_client)
    path = "/api/vocabulary/topics/food-and-drink/words/apple/state"
    payload = {"client_request_id": str(uuid4()), "remembered": True, "version": 0}
    saved = await chat_client.put(path, json=payload)
    assert saved.status_code == 200
    assert saved.json()["version"] == 1
    assert (await chat_client.put(path, json=payload)).json() == saved.json()
    assert (
        await chat_client.put(path, json={**payload, "remembered": False})
    ).status_code == 409
    assert (
        await chat_client.put(path, json={**payload, "client_request_id": str(uuid4())})
    ).status_code == 409
    assert (
        await chat_client.put(path, json={**payload, "user_id": 999})
    ).status_code == 422
    assert (
        await chat_client.put(path.replace("apple", "unknown"), json=payload)
    ).status_code == 404
    await register(chat_client, "other")
    assert (await chat_client.get("/api/vocabulary/me/states")).json()["states"] == []
    assert (await chat_client.put(path, json=payload)).status_code == 200
    chat_client.headers["Authorization"] = "Bearer " + str(first["access_token"])
    current = (await chat_client.get("/api/vocabulary/me/states")).json()
    assert current == {"states": [saved.json()], "legacy_imported": False}
    updated = await chat_client.put(
        path,
        json={"client_request_id": str(uuid4()), "remembered": False, "version": 1},
    )
    assert updated.json()["version"] == 2
    assert (await chat_client.put(path, json=payload)).json() == saved.json()
    current = (await chat_client.get("/api/vocabulary/me/states")).json()
    assert current["states"] == [updated.json()]


async def test_confirmed_legacy_import_never_overwrites_existing_false(
    chat_client: AsyncClient,
) -> None:
    """A server false wins, both same-UUID and new-UUID imports remain one-time."""
    await register(chat_client)
    original = await chat_client.put(
        "/api/vocabulary/topics/legacy-cafe/words/word-1/state",
        json={"client_request_id": str(uuid4()), "remembered": False, "version": 0},
    )
    assert original.status_code == 200
    body = {
        "client_request_id": str(uuid4()),
        "remembered_keys": ["cafe:I’d like…", "cafe:What size…?"],
    }
    imported = await chat_client.post("/api/vocabulary/me/import-legacy", json=body)
    assert imported.json() == {"imported": 1, "skipped": 1}
    assert (
        await chat_client.post("/api/vocabulary/me/import-legacy", json=body)
    ).json() == imported.json()
    assert (
        await chat_client.post(
            "/api/vocabulary/me/import-legacy", json={**body, "remembered_keys": []}
        )
    ).status_code == 409
    repeated = await chat_client.post(
        "/api/vocabulary/me/import-legacy",
        json={"client_request_id": str(uuid4()), "remembered_keys": ["cafe:Take away"]},
    )
    assert repeated.json() == {"imported": 0, "skipped": 1}
    state = (await chat_client.get("/api/vocabulary/me/states")).json()
    assert state["legacy_imported"] is True
    assert len(state["states"]) == 2
    assert (
        next(row for row in state["states"] if row["word_id"] == "word-1")["remembered"]
        is False
    )
    assert (
        await chat_client.post(
            "/api/vocabulary/me/import-legacy",
            json={"client_request_id": str(uuid4()), "remembered_keys": ["fake:score"]},
        )
    ).status_code == 422


async def test_vocabulary_tables_are_additive_and_match_metadata(
    database: Database,
) -> None:
    """Installed tables have the intended owner keys and no foreign keys/triggers."""
    with database.transaction() as connection:
        schema = inspect(connection)
        for table in metadata.sorted_tables:
            columns = {
                column["name"]: column for column in schema.get_columns(table.name)
            }
            assert set(columns) == set(table.columns.keys())
            assert schema.get_pk_constraint(table.name)["constrained_columns"] == [
                column.name for column in table.primary_key
            ]
            assert schema.get_foreign_keys(table.name) == []
            assert {name: column["nullable"] for name, column in columns.items()} == {
                column.name: column.nullable for column in table.columns
            }
        nullable_jobs = {
            column.name for column in generation_jobs.columns if column.nullable
        }
        assert nullable_jobs == {"TopicId", "ErrorCode", "FinishedAt"}
        triggers = connection.execute(
            text(
                "SELECT TRIGGER_NAME FROM information_schema.TRIGGERS "
                "WHERE TRIGGER_SCHEMA = DATABASE() "
                "AND EVENT_OBJECT_TABLE LIKE 'engmate_vocabulary_%'"
            )
        ).all()
        assert triggers == []


def test_concurrent_same_uuid_writes_once_in_mysql() -> None:
    """Two independent connections serialize on the real owner row, not a fake lock."""
    configured = os.getenv("MYSQL_TEST_URL")
    if not configured:
        pytest.skip("Requires the explicitly isolated MySQL test database.")
    url = make_url(configured)
    assert url.database and url.database.endswith("_test")
    assert url.host in {"localhost", "127.0.0.1", "::1"}
    assert url.username and url.username != "root"
    db = Database(
        Settings(
            llm_provider="mock",
            database_mysql_url=SecretStr(configured),
            jwt_secret=SecretStr("test-secret-with-at-least-thirty-two-characters"),
        )
    )
    user_id = None
    try:
        with db.transaction() as connection:
            repo = Repository(db, connection)
            users = db.models.table("Users", connection)
            assert connection.execute(select(users.c.UserId)).first() is None
            suffix = uuid4().hex[:8]
            user = repo.insert(
                "Users",
                Username="vocab" + suffix,
                Email="vocab" + suffix + "@example.test",
                PasswordHash="test-placeholder-not-used-for-authentication",
            )
            user_id = int(user["UserId"])
        barrier = Barrier(2)
        service = VocabularyService(db)
        data = WordStateUpdate(client_request_id=uuid4(), remembered=True, version=0)

        def save() -> dict[str, object]:
            barrier.wait(timeout=10)
            assert user_id is not None
            return service.save(user_id, "food-and-drink", "apple", data)

        with ThreadPoolExecutor(max_workers=2) as pool:
            first, second = pool.submit(save), pool.submit(save)
            assert first.result(timeout=30) == second.result(timeout=30)
        with db.transaction() as connection:
            assert len(connection.execute(select(word_states)).all()) == 1
            assert len(connection.execute(select(requests)).all()) == 1
    finally:
        if user_id is not None:
            with db.transaction() as connection:
                connection.execute(
                    word_states.delete().where(word_states.c.UserId == user_id)
                )
                connection.execute(
                    requests.delete().where(requests.c.UserId == user_id)
                )
                users = db.models.table("Users", connection)
                connection.execute(users.delete().where(users.c.UserId == user_id))
        db.close()
