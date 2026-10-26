"""Selected voice metadata follows each persisted turn, even after a voice change."""

from uuid import uuid4

import pytest
from fastapi import HTTPException
from httpx import AsyncClient

from app.db.database import Database
from app.db.repository import Repository
from app.schemas.chat import MessageCreate
from app.services.conversations import ConversationService, PendingTurn

from .test_chat_database import chat_client as chat_client
from .test_chat_database import conversation, register
from .test_chat_database import database as database

pytestmark = pytest.mark.anyio


async def test_voice_switch_overrides_old_identity_and_retries_are_bound_to_gender(
    chat_client: AsyncClient, database: Database
) -> None:
    """A new female persona retains the previous male reply only as history data."""
    await register(chat_client)
    identity = await conversation(chat_client)
    assert database.external_connection is not None
    repo = Repository(database, database.external_connection)
    uid = repo.one("Users", Username="learner")["UserId"]
    service = ConversationService(database)
    first = service.prepare(
        uid,
        identity,
        MessageCreate(
            client_request_id=uuid4(),
            message="Xin chào",
            voice=True,
            voice_gender="male",
        ),
    )
    assert isinstance(first, PendingTurn)
    assert 'introduce yourself as "thầy Mate"' in first.prompt
    reply = "Thầy là thầy Mate."
    service.finalize(uid, first, "completed", reply, 0)
    service.playback(uid, identity, first.assistant["MessageId"], len(reply))
    data = MessageCreate(
        client_request_id=uuid4(), message="Chào cô", voice=True, voice_gender="female"
    )
    second = service.prepare(uid, identity, data)
    assert isinstance(second, PendingTurn)
    assert second.history[-1]["content"] == reply
    assert 'introduce yourself as "cô Mate"' in second.prompt
    service.finalize(uid, second, "completed", "Cô chào em!", 0)
    assert isinstance(service.prepare(uid, identity, data), dict)
    with pytest.raises(HTTPException) as failure:
        service.prepare(uid, identity, data.model_copy(update={"voice_gender": "male"}))
    assert failure.value.status_code == 409
