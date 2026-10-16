"""Stream and cancellation lifecycles on the isolated real MySQL schema."""

import json
from collections.abc import AsyncIterator
from unittest.mock import Mock
from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.db.database import Database
from app.db.repository import Repository
from app.schemas.chat import MessageCreate
from app.services.conversations import ConversationService, PendingTurn
from tests.fakes import MockLLMClient

from .test_chat_database import (
    chat_client as chat_client,
)
from .test_chat_database import (
    conversation,
    register,
)
from .test_chat_database import (
    database as database,
)

pytestmark = pytest.mark.anyio


async def test_sse_persistence_retry_context_and_no_duplication(
    chat_client: AsyncClient, database: Database
) -> None:
    """Reuse message IDs on retry and send stored context as typed model input."""
    await register(chat_client)
    identity = await conversation(chat_client)
    data = {"client_request_id": str(uuid4()), "message": "My name is Hoang"}
    result = await chat_client.post(
        f"/api/conversations/{identity}/messages/stream", json=data
    )
    assert result.status_code == 200
    events = [
        json.loads(line[6:])
        for line in result.text.splitlines()
        if line.startswith("data: ")
    ]
    assert [event["type"] for event in events] == ["start", "delta", "done"]
    assert "user_id" not in events[0]["message"]
    assert set(events[-1]["turn"]["evaluation"]) == {"status", "provider", "is_mock"}
    assert (
        events[0]["response_id"] == events[1]["response_id"] == events[2]["response_id"]
    )
    again = await chat_client.post(
        f"/api/conversations/{identity}/messages/stream", json=data
    )
    assert [
        json.loads(line[6:])["type"]
        for line in again.text.splitlines()
        if line.startswith("data: ")
    ] == ["done"]
    rows = (await chat_client.get(f"/api/conversations/{identity}/messages")).json()
    assert len(rows) == 2 and rows[1]["status"] == "completed"
    assert database.external_connection is not None
    uid = Repository(database, database.external_connection).one(
        "Users", Username="learner"
    )["UserId"]
    service = ConversationService(database)
    turn = service.prepare(
        uid,
        identity,
        MessageCreate(client_request_id=uuid4(), message="What is my name?"),
    )
    assert isinstance(turn, PendingTurn)
    assert turn.history == [
        {"role": "user", "content": "My name is Hoang"},
        {"role": "assistant", "content": rows[1]["content"]},
    ]
    assert "Hoang" not in turn.prompt
    stream = service.stream_turn(uid, turn, MockLLMClient())
    assert (await anext(stream))["type"] == "start"
    await stream.aclose()
    assert service.messages(uid, identity, 0, 50)[-1]["status"] == "cancelled"


async def test_stream_errors_persist_failed(
    chat_client: AsyncClient, database: Database
) -> None:
    """A provider stream failure never becomes a completed assistant row."""
    await register(chat_client)
    identity = await conversation(chat_client)
    assert database.external_connection is not None
    uid = Repository(database, database.external_connection).one(
        "Users", Username="learner"
    )["UserId"]
    service = ConversationService(database)
    turn = service.prepare(
        uid, identity, MessageCreate(client_request_id=uuid4(), message="Hello")
    )

    async def broken(*args: object) -> AsyncIterator[str]:
        yield "partial"
        raise TimeoutError()

    client = Mock()
    client.stream = broken
    events = [event async for event in service.stream_turn(uid, turn, client)]
    assert events[-1]["type"] == "error" and events[-1]["status"] == 504
    assert service.messages(uid, identity, 0, 50)[-1]["status"] == "failed"
