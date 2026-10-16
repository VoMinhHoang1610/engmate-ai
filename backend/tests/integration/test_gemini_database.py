"""Gemini chat/voice use the same authenticated MySQL history, with fake transport."""

import json
from unittest.mock import AsyncMock
from uuid import uuid4

import httpx
import pytest
from pydantic import SecretStr

from app.api.dependencies import get_llm_client
from app.db.database import Database
from app.llm.gemini import GeminiLLMClient
from app.main import create_app
from app.services.gemini_voice import GeminiSession, GeminiVoiceManager

from .test_chat_database import chat_client as chat_client
from .test_chat_database import conversation, register
from .test_chat_database import database as database

pytestmark = pytest.mark.anyio


async def test_gemini_stream_retry_voice_context_and_owned_history(
    chat_client: httpx.AsyncClient, database: Database, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Run real SQL reservation/finalization, but never send data to a paid model."""
    tokens = await register(chat_client)
    identity = await conversation(chat_client)
    database.settings.llm_provider = "gemini"
    database.settings.gemini_api_key = SecretStr("gemini-test-key")
    app = create_app(database.settings, database)
    calls: list[dict[str, object]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(json.loads(request.content))
        assert request.url.host == "generativelanguage.googleapis.com"
        event = {
            "candidates": [
                {"content": {"parts": [{"text": "Hi Linh!"}]}, "finishReason": "STOP"}
            ]
        }
        return httpx.Response(200, text="data: " + json.dumps(event) + "\n\n")

    app.dependency_overrides[get_llm_client] = lambda: GeminiLLMClient(
        database.settings, httpx.MockTransport(handler)
    )
    manager: GeminiVoiceManager = app.state.voice
    opened = AsyncMock()
    monkeypatch.setattr(manager.live, "open", opened)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
        headers=dict(chat_client.headers),
    ) as client:
        data = {"client_request_id": str(uuid4()), "message": "My name is Linh"}
        path = f"/api/conversations/{identity}/messages/stream"
        response = await client.post(path, json=data)
        events = [
            json.loads(line[6:])
            for line in response.text.splitlines()
            if line.startswith("data: ")
        ]
        assert [event["type"] for event in events] == ["start", "delta", "done"]
        assert events[-1]["turn"]["evaluation"]["provider"] == "gemini"
        again = await client.post(path, json=data)
        assert len(calls) == 1 and '"type":"done"' in again.text.replace(" ", "")
        grant = await client.post(f"/api/conversations/{identity}/voice", json={})
        assert grant.status_code == 200 and grant.json()["transport"] == "websocket"
        sid = grant.json()["session_id"]
        session = manager.sessions[sid]
        assert isinstance(session, GeminiSession)
        assert session.history == [
            {"role": "user", "content": "My name is Linh"},
            {"role": "assistant", "content": "Hi Linh!"},
        ]
        opened.assert_not_called()
        assert (
            await client.post(
                path, json={"client_request_id": str(uuid4()), "message": "Overlap"}
            )
        ).status_code == 409
        assert (
            await client.post(f"/api/conversations/{identity}/close")
        ).status_code == 409
        session.browser = AsyncMock()
        await manager.provider_event(
            session,
            {
                "serverContent": {
                    "inputTranscription": {"text": "Do you remember me?"},
                    "outputTranscription": {"text": "Your name is Linh."},
                    "turnComplete": True,
                }
            },
        )
        rows = (await client.get(f"/api/conversations/{identity}/messages")).json()
        assert [row["content"] for row in rows] == [
            "My name is Linh",
            "Hi Linh!",
            "Do you remember me?",
            "Your name is Linh.",
        ]
        await manager.provider_event(session, {"serverContent": {"interrupted": True}})
        rows = (await client.get(f"/api/conversations/{identity}/messages")).json()
        assert rows[-1]["status"] == "cancelled" and rows[-1]["content"] == ""
        other = await register(chat_client, "other")
        client.headers["Authorization"] = "Bearer " + str(other["access_token"])
        assert (await client.post(f"/api/voice/{sid}/heartbeat")).status_code == 404
        assert (await client.delete(f"/api/voice/{sid}")).status_code == 404
        client.headers["Authorization"] = "Bearer " + str(tokens["access_token"])
        assert (await client.delete(f"/api/voice/{sid}")).status_code == 204
        assert not manager.sessions
