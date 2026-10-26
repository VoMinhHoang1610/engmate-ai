"""Cursor history and playback-context contracts on a separate MySQL schema."""

from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.db.database import Database
from app.db.repository import Repository
from app.schemas.chat import MessageCreate
from app.services.conversations import ConversationService, PendingTurn

from .test_chat_database import chat_client as chat_client
from .test_chat_database import conversation, register
from .test_chat_database import database as database

pytestmark = pytest.mark.anyio


async def test_cursor_pages_overlap_reconciliation_and_ownership(
    chat_client: AsyncClient, database: Database
) -> None:
    """Latest/before/after queries return bounded ordered pages without lost IDs."""
    await register(chat_client)
    identity = await conversation(chat_client)
    assert database.external_connection is not None
    repo = Repository(database, database.external_connection)
    uid = repo.one("Users", Username="learner")["UserId"]
    table = database.models.table("Messages", database.external_connection)
    database.external_connection.execute(
        table.insert(),
        [
            {
                "UserId": uid,
                "ConversationId": identity,
                "SequenceNumber": index,
                "ClientRequestId": str(uuid4()),
                "Role": "user" if index % 2 == 0 else "assistant",
                "Content": f"message-{index}",
            }
            for index in range(1002)
        ],
    )
    path = f"/api/conversations/{identity}/messages"
    last = (await chat_client.get(path + "?latest=true&limit=100")).json()
    assert len(last) == 100 and last[0]["content"] == "message-902"
    older = (
        await chat_client.get(path + f"?before_id={last[0]['message_id']}&limit=100")
    ).json()
    assert len(older) == 100 and older[-1]["content"] == "message-901"
    tail = (await chat_client.get(path + f"?after_id={last[-2]['message_id']}")).json()
    assert tail == [last[-1]]
    assert (await chat_client.get(path + "?latest=true&after_id=1")).status_code == 422
    await register(chat_client, "other")
    assert (await chat_client.get(path + "?latest=true")).status_code == 404


async def test_voice_context_is_bounded_more_tightly_than_text(
    chat_client: AsyncClient, database: Database
) -> None:
    """Keep voice history small while text retains its larger budget."""
    await register(chat_client)
    identity = await conversation(chat_client)
    assert database.external_connection is not None
    repo = Repository(database, database.external_connection)
    uid = repo.one("Users", Username="learner")["UserId"]
    table = database.models.table("Messages", database.external_connection)
    database.external_connection.execute(
        table.insert(),
        [
            {
                "UserId": uid,
                "ConversationId": identity,
                "SequenceNumber": index,
                "ClientRequestId": str(uuid4()),
                "Role": "user" if index % 2 == 0 else "assistant",
                "Content": f"message-{index}",
            }
            for index in range(1, 25)
        ],
    )
    service = ConversationService(database)
    text = service.context(repo, identity)
    voice = service.context(repo, identity, voice=True)
    assert len(text) == 20 and text[0]["content"] == "message-5"
    assert len(voice) == 12 and voice[0]["content"] == "message-13"
    assert text[-1]["content"] == voice[-1]["content"] == "message-24"


async def test_voice_receipt_is_monotonic_owned_and_preserves_visible_history(
    chat_client: AsyncClient, database: Database
) -> None:
    """Unheard generated text is excluded from voice, retained for text/history."""
    await register(chat_client)
    identity = await conversation(chat_client)
    result = await chat_client.post(
        f"/api/conversations/{identity}/messages",
        json={
            "client_request_id": str(uuid4()),
            "message": "Hi",
            "voice": True,
        },
    )
    assert result.status_code == 200
    reply = result.json()["reply"]
    response_id = reply["message_id"]
    path = f"/api/conversations/{identity}/messages/{response_id}/playback"
    assert database.external_connection is not None
    repo = Repository(database, database.external_connection)
    uid = repo.one("Users", Username="learner")["UserId"]
    service = ConversationService(database)
    assert service.context(repo, identity, voice=True) == [
        {"role": "user", "content": "Hi"}
    ]
    assert (await chat_client.post(path, json={"heard_chars": 5})).json() == {
        "heard_chars": 5
    }
    assert (await chat_client.post(path, json={"heard_chars": 2})).json() == {
        "heard_chars": 5
    }
    assert (
        service.context(repo, identity, voice=True)[-1]["content"]
        == reply["content"][:5]
    )
    assert service.context(repo, identity)[-1]["content"] == reply["content"]
    assert (
        await chat_client.post(path, json={"heard_chars": 12000})
    ).status_code == 422
    turn = service.prepare(
        uid,
        identity,
        MessageCreate(client_request_id=uuid4(), message="Next", voice=True),
    )
    assert (
        isinstance(turn, PendingTurn)
        and turn.history[-1]["content"] == reply["content"][:5]
    )
    assert (await chat_client.post(path, json={"heard_chars": 10})).json() == {
        "heard_chars": 5
    }
    await register(chat_client, "other")
    assert (await chat_client.post(path, json={"heard_chars": 5})).status_code == 404
