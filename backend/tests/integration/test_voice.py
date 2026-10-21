"""Verify voice authentication and authoritative persistence on real test MySQL."""

import asyncio
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import SecretStr

from app.db.database import Database
from app.main import create_app
from app.services.realtime import RealtimeManager

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


async def test_owned_voice_lifecycle_and_shared_history(
    chat_client: AsyncClient, database: Database, monkeypatch: pytest.MonkeyPatch
) -> None:
    """No fake assistant text from the browser; sideband writes real SQL lifecycle."""
    tokens = await register(chat_client)
    identity = await conversation(chat_client)
    database.settings.llm_provider = "openai"
    database.settings.voice_provider = "native"
    database.settings.openai_api_key = SecretStr("test-voice-key")
    application = create_app(database.settings, database)
    manager: RealtimeManager = application.state.voice
    create = AsyncMock(return_value=("v=0\r\nanswer", "rtc_test"))
    hangup = AsyncMock(return_value=True)
    monkeypatch.setattr(manager.provider, "create", create)
    monkeypatch.setattr(manager.provider, "hangup", hangup)
    socket = AsyncMock()

    async def wait() -> str:
        await asyncio.Event().wait()
        return ""

    socket.recv.side_effect = wait
    monkeypatch.setattr(manager.provider, "attach", AsyncMock(return_value=socket))
    async with AsyncClient(
        transport=ASGITransport(app=application),
        base_url="http://test",
        headers=dict(chat_client.headers),
    ) as client:
        assert (
            await client.post(
                "/api/conversations/999999/voice", json={"sdp": "v=0\r\noffer"}
            )
        ).status_code == 404
        create.assert_not_called()
        response = await client.post(
            f"/api/conversations/{identity}/voice", json={"sdp": "v=0\r\noffer"}
        )
        assert response.status_code == 200
        sid = response.json()["session_id"]
        assert "test-voice-key" not in response.text
        session = next(iter(manager.sessions.values()))
        await asyncio.sleep(0)
        assert (await client.post(f"/api/voice/{sid}/heartbeat")).status_code == 200
        assert (
            await client.post(f"/api/conversations/{identity}/close")
        ).status_code == 409
        assert (
            await client.post(
                f"/api/conversations/{identity}/messages",
                json={
                    "client_request_id": "7709f957-51b1-4382-b091-6775723a4cbc",
                    "message": "Overlap",
                },
            )
        ).status_code == 409
        await manager.event(
            session, {"type": "input_audio_buffer.committed", "item_id": "input1"}
        )
        await manager.event(
            session,
            {
                "type": "conversation.item.input_audio_transcription.completed",
                "item_id": "input1",
                "transcript": "My favorite color is red",
            },
        )
        await manager.event(
            session, {"type": "response.created", "response": {"id": "response1"}}
        )
        await manager.event(
            session,
            {
                "type": "response.done",
                "response": {
                    "id": "response1",
                    "status": "completed",
                    "output": [
                        {
                            "id": "output1",
                            "content": [
                                {"transcript": "I will remember your favorite color"}
                            ],
                        }
                    ],
                },
            },
        )
        rows = (await client.get(f"/api/conversations/{identity}/messages")).json()
        assert [row["role"] for row in rows] == ["user", "assistant"]
        assert rows[0]["content"] == "My favorite color is red"
        assert rows[1]["status"] == "completed"
        await manager.event(
            session, {"type": "conversation.item.truncated", "item_id": "output1"}
        )
        rows = (await client.get(f"/api/conversations/{identity}/messages")).json()
        assert rows[1]["status"] == "cancelled" and rows[1]["content"] == ""
        other = await register(chat_client, "other")
        client.headers["Authorization"] = "Bearer " + str(other["access_token"])
        assert (await client.post(f"/api/voice/{sid}/heartbeat")).status_code == 404
        assert (await client.delete(f"/api/voice/{sid}")).status_code == 404
        client.headers["Authorization"] = "Bearer " + str(tokens["access_token"])
        assert (await client.delete(f"/api/voice/{sid}")).status_code == 204
        assert (await client.delete(f"/api/voice/{sid}")).status_code == 204
        assert not manager.sessions
        hangup.assert_awaited_once_with("rtc_test")
