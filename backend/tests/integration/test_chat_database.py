"""Account and conversation workflows on an explicitly isolated MySQL schema."""

import asyncio
import os
from collections.abc import AsyncIterator, Iterator
from datetime import timedelta
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
from pydantic import SecretStr
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

from app.api.dependencies import get_llm_client
from app.core.config import Settings
from app.core.security import access_token
from app.db.database import Database
from app.db.repository import Repository
from app.main import create_app
from app.schemas.chat import ConversationCreate, MessageCreate
from app.services.auth import AuthService
from app.services.common import now
from app.services.conversations import ConversationService, PendingTurn
from tests.fakes import MockLLMClient

pytestmark = pytest.mark.anyio
PASSWORD = "a-private-test-password"


@pytest.fixture
def database() -> Iterator[Database]:
    """Roll back every test; never accept the user's application schema."""
    configured = os.getenv("MYSQL_TEST_URL")
    if not configured:
        pytest.skip("Set MYSQL_TEST_URL to an empty, separate _test schema.")
    url = make_url(configured)
    assert url.database and url.database.endswith("_test")
    engine = create_engine(
        url,
        hide_parameters=True,
        connect_args={"init_command": "SET time_zone = '+00:00'"},
    )
    with engine.connect() as connection:
        outer = connection.begin()
        assert (
            connection.execute(text("SELECT COUNT(*) FROM NguoiDung")).scalar_one() == 0
        )
        settings = Settings(
            llm_provider="mock",
            database_mysql_url=SecretStr(configured),
            jwt_secret=SecretStr("test-secret-with-at-least-thirty-two-characters"),
        )
        yield Database(settings, connection)
        outer.rollback()
    engine.dispose()


@pytest.fixture
async def chat_client(database: Database) -> AsyncIterator[AsyncClient]:
    """Exercise HTTP, service and real SQL together with no paid requests."""
    application = create_app(database.settings, database)
    application.dependency_overrides[get_llm_client] = MockLLMClient
    async with AsyncClient(
        transport=ASGITransport(app=application),
        base_url="http://test",
    ) as client:
        yield client


async def register(client: AsyncClient, suffix: str = "") -> dict[str, object]:
    """Create one disposable account and authenticate the shared test client."""
    response = await client.post(
        "/api/auth/register",
        json={
            "username": "learner" + suffix,
            "email": "learner" + suffix + "@example.test",
            "display_name": "Test",
            "password": PASSWORD,
        },
    )
    assert response.status_code == 201, response.text
    result: dict[str, object] = response.json()
    client.headers["Authorization"] = "Bearer " + str(result["access_token"])
    return result


async def conversation(client: AsyncClient) -> int:
    """Create a free chat using a unique retry identity."""
    response = await client.post(
        "/api/conversations",
        json={"client_request_id": str(uuid4()), "title": "A test conversation"},
    )
    assert response.status_code == 201
    return int(response.json()["conversation_id"])


async def test_account_sessions(chat_client: AsyncClient, database: Database) -> None:
    """Verify login, credential errors, rotation, revocation and private fields."""
    first = await register(chat_client)
    me = await chat_client.get("/api/me")
    assert me.status_code == 200 and "password" not in me.text.lower()
    duplicate = await chat_client.post(
        "/api/auth/register",
        json={
            "username": "learner",
            "email": "learner@example.test",
            "display_name": "Test",
            "password": PASSWORD,
        },
    )
    assert duplicate.status_code == 409
    for identifier, password in [("learner", "wrong"), ("missing", PASSWORD)]:
        assert (
            await chat_client.post(
                "/api/auth/login", json={"identifier": identifier, "password": password}
            )
        ).status_code == 401
    logged = await chat_client.post(
        "/api/auth/login",
        json={"identifier": "learner@example.test", "password": PASSWORD},
    )
    assert logged.status_code == 200
    rotated = await chat_client.post(
        "/api/auth/refresh", json={"refresh_token": first["refresh_token"]}
    )
    assert rotated.status_code == 200
    assert (
        await chat_client.post(
            "/api/auth/refresh", json={"refresh_token": first["refresh_token"]}
        )
    ).status_code == 401
    assert (await chat_client.get("/api/me")).status_code == 401
    chat_client.headers["Authorization"] = "Bearer " + rotated.json()["access_token"]
    assert (await chat_client.post("/api/auth/logout")).status_code == 204
    assert (await chat_client.get("/api/me")).status_code == 401
    service = AuthService(database, database.settings)
    with pytest.raises(HTTPException):
        service.refresh("missing-refresh-token")
    with database.transaction() as connection:
        repo = Repository(database, connection)
        user = repo.one("Users", Username="learner")
        repo.update("Users", {"UserId": user["UserId"]}, {"Status": "disabled"})
    assert (
        await chat_client.post(
            "/api/auth/login", json={"identifier": "learner", "password": PASSWORD}
        )
    ).status_code == 401
    with pytest.raises(HTTPException):
        service.authenticate(access_token(database.settings, str(uuid4()), 1))
    with pytest.raises(HTTPException):
        service.authenticate(access_token(database.settings, "invalid-uuid", 1))


async def test_chat_history_retry_and_ownership(
    chat_client: AsyncClient, database: Database
) -> None:
    """Persist turns, return stable retries, reject forged ownership and closed chat."""
    await register(chat_client)
    ready = await chat_client.get("/api/ready")
    assert ready.status_code == 200 and ready.json()["database"] == "mysql"
    request = {"client_request_id": str(uuid4()), "title": "My day"}
    created = await chat_client.post("/api/conversations", json=request)
    identity = created.json()["conversation_id"]
    assert (
        await chat_client.post("/api/conversations", json=request)
    ).json() == created.json()
    assert (
        await chat_client.post(
            "/api/conversations", json={**request, "title": "Different"}
        )
    ).status_code == 409
    assert (await chat_client.get(f"/api/conversations/{identity}")).json()[
        "status"
    ] == "in_progress"
    payload = {"client_request_id": str(uuid4()), "message": "Hello"}
    result = await chat_client.post(
        f"/api/conversations/{identity}/messages", json=payload
    )
    assert result.status_code == 200
    assert result.json()["reply"]["status"] == "completed"
    assert "[Mock/" in result.json()["reply"]["content"]
    assert (
        await chat_client.post(f"/api/conversations/{identity}/messages", json=payload)
    ).json() == result.json()
    assert (
        await chat_client.post(
            f"/api/conversations/{identity}/messages",
            json={**payload, "message": "Changed"},
        )
    ).status_code == 409
    rows = (await chat_client.get(f"/api/conversations/{identity}/messages")).json()
    assert [r["role"] for r in rows] == ["user", "assistant"]
    await register(chat_client, "other")
    for path in (
        f"/api/conversations/{identity}",
        f"/api/conversations/{identity}/messages",
    ):
        assert (await chat_client.get(path)).status_code == 404
    assert (
        await chat_client.post(f"/api/conversations/{identity}/cancel")
    ).status_code == 404
    await chat_client.post(
        "/api/auth/login", json={"identifier": "learner", "password": PASSWORD}
    )
    # The first user's tokens remain independent of the second user's tokens.
    logged = (
        await chat_client.post(
            "/api/auth/login", json={"identifier": "learner", "password": PASSWORD}
        )
    ).json()
    chat_client.headers["Authorization"] = "Bearer " + logged["access_token"]
    assert (
        await chat_client.post(f"/api/conversations/{identity}/close")
    ).status_code == 200
    assert (
        await chat_client.post(f"/api/conversations/{identity}/close")
    ).status_code == 200
    assert (await chat_client.get(f"/api/conversations/{identity}")).json()[
        "status"
    ] == "completed"
    assert (
        await chat_client.post(
            f"/api/conversations/{identity}/messages",
            json={"client_request_id": str(uuid4()), "message": "Late"},
        )
    ).status_code == 409


async def test_history_over_one_hundred(
    chat_client: AsyncClient, database: Database
) -> None:
    """The latest chat is present even after the first hundred conversations."""
    await register(chat_client)
    service = ConversationService(database)
    assert database.external_connection is not None
    user_id = Repository(database, database.external_connection).one(
        "Users", Username="learner"
    )["UserId"]
    for index in range(105):
        service.start(
            user_id,
            ConversationCreate(client_request_id=uuid4(), title=f"Chat {index}"),
        )
    first = (await chat_client.get("/api/conversations?limit=100")).json()
    second = (await chat_client.get("/api/conversations?limit=100&offset=100")).json()
    assert first[0]["title"] == "Chat 104" and second[-1]["title"] == "Chat 0"
    assert len(first) == 100 and len(second) == 5
    assert len({r["conversation_id"] for r in first + second}) == 105


async def test_failed_pending_cancel_and_recovery(
    chat_client: AsyncClient, database: Database
) -> None:
    """Provider errors, stale reservations and late replies have recoverable state."""
    await register(chat_client)
    identity = await conversation(chat_client)
    assert database.external_connection is not None
    user = Repository(database, database.external_connection).one(
        "Users", Username="learner"
    )
    service = ConversationService(database)
    data = MessageCreate(client_request_id=uuid4(), message="Hello")
    turn = service.prepare(user["UserId"], identity, data)
    assert isinstance(turn, PendingTurn)
    assert (
        await chat_client.post(
            f"/api/conversations/{identity}/messages",
            json={"client_request_id": str(uuid4()), "message": "Too soon"},
        )
    ).status_code == 409
    assert (
        await chat_client.post(f"/api/conversations/{identity}/close")
    ).status_code == 409
    assert (
        await chat_client.post(f"/api/conversations/{identity}/cancel")
    ).status_code == 200
    result = service.finalize(user["UserId"], turn, "completed", "Late reply", 1)
    assert result["reply"]["status"] == "cancelled"
    assert result["reply"]["content"] == ""
    with database.transaction() as connection:
        Repository(database, connection).update(
            "Messages",
            {"MessageId": turn.assistant["MessageId"]},
            {"Status": "pending", "CreatedAt": now() - timedelta(seconds=91)},
        )
    assert (await chat_client.get(f"/api/conversations/{identity}/messages")).json()[
        -1
    ]["status"] == "failed"
    for error, status in [
        (TimeoutError(), 504),
        (ValueError("private detail"), 502),
        (HTTPException(503, "Provider unavailable"), 503),
    ]:
        model = AsyncMock()
        model.generate.side_effect = error
        with pytest.raises(HTTPException) as raised:
            await service.send(
                user["UserId"],
                identity,
                MessageCreate(client_request_id=uuid4(), message="Retry"),
                model,
            )
        assert raised.value.status_code == status
    model = AsyncMock()
    model.generate.return_value = " "
    with pytest.raises(HTTPException):
        await service.send(
            user["UserId"],
            identity,
            MessageCreate(client_request_id=uuid4(), message="Empty"),
            model,
        )
    model.generate.side_effect = asyncio.CancelledError()
    with pytest.raises(asyncio.CancelledError):
        await service.send(
            user["UserId"],
            identity,
            MessageCreate(client_request_id=uuid4(), message="Cancel"),
            model,
        )
    database.settings.llm_provider = "blaze"
    with pytest.raises(HTTPException) as raised:
        await service.send(
            user["UserId"],
            identity,
            MessageCreate(client_request_id=uuid4(), message="Real"),
            MockLLMClient(),
        )
    assert raised.value.status_code == 503


async def test_actual_pool_and_schema_guards(database: Database) -> None:
    """Test the real engine configuration, safe reflection and readiness errors."""
    independent = Database(database.settings)
    try:
        with independent.transaction() as connection:
            assert (
                connection.execute(text("SELECT @@session.time_zone")).scalar_one()
                == "+00:00"
            )
            assert (
                connection.execute(text("SELECT @@transaction_isolation")).scalar_one()
                == "READ-COMMITTED"
            )
            independent.lock_user(connection, -1)
            assert independent.get_engine() is independent.get_engine()
            with pytest.raises(ValueError):
                independent.models.table("Lessons", connection)
    finally:
        independent.close()
    assert database.external_connection is not None
    database.external_connection.execute(
        text("UPDATE PhienBanCauTruc SET Version=9 WHERE Version=1")
    )
    async with AsyncClient(
        transport=ASGITransport(app=create_app(database.settings, database)),
        base_url="http://test",
    ) as client:
        assert (await client.get("/api/ready")).status_code == 503
