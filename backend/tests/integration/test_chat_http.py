"""Exercise the account/chat user journey over actual loopback HTTP and MySQL."""

import asyncio
import socket
import threading
from uuid import uuid4

import httpx
import pytest
import uvicorn

from app.api.dependencies import get_llm_client
from app.db.database import Database
from app.main import create_app
from tests.fakes import MockLLMClient

from .test_chat_database import database as database

pytestmark = pytest.mark.anyio


async def test_account_chat_reload_and_logout_over_http(database: Database) -> None:
    """Keep history across HTTP clients and enforce logout on a real server."""
    listener = socket.socket()
    listener.bind(("127.0.0.1", 0))
    port = listener.getsockname()[1]
    application = create_app(database.settings, database)
    application.dependency_overrides[get_llm_client] = MockLLMClient
    server = uvicorn.Server(
        uvicorn.Config(
            application,
            log_level="error",
            access_log=False,
        )
    )
    thread = threading.Thread(
        target=server.run, kwargs={"sockets": [listener]}, daemon=True
    )
    thread.start()
    try:
        for _ in range(500):
            if server.started:
                break
            await asyncio.sleep(0.01)
        assert server.started
        async with httpx.AsyncClient(
            base_url=f"http://127.0.0.1:{port}", trust_env=False
        ) as client:
            account = {
                "username": "http_learner",
                "email": "http_learner@example.test",
                "display_name": "HTTP Test",
                "password": "http-test-password-123",
            }
            assert (
                await client.post("/api/auth/register", json=account)
            ).status_code == 201
            credentials = {
                "identifier": account["username"],
                "password": account["password"],
            }
            token = (await client.post("/api/auth/login", json=credentials)).json()[
                "access_token"
            ]
            client.headers["Authorization"] = f"Bearer {token}"
            assert (await client.get("/api/ready")).status_code == 200
            created = await client.post(
                "/api/conversations",
                json={
                    "client_request_id": str(uuid4()),
                    "title": "HTTP end-to-end",
                },
            )
            assert created.status_code == 201
            identity = created.json()["conversation_id"]
            turn = await client.post(
                f"/api/conversations/{identity}/messages",
                json={
                    "client_request_id": str(uuid4()),
                    "message": "Hello from HTTP",
                },
            )
            assert turn.status_code == 200
            assert turn.json()["reply"]["status"] == "completed"
            assert "overall_score" not in turn.json()["evaluation"]
            client.headers.pop("Authorization")
            assert (await client.get("/api/me")).status_code == 401
            token = (await client.post("/api/auth/login", json=credentials)).json()[
                "access_token"
            ]
            client.headers["Authorization"] = f"Bearer {token}"
            history = (await client.get("/api/conversations")).json()
            assert history[0]["conversation_id"] == identity
            messages = (
                await client.get(f"/api/conversations/{identity}/messages")
            ).json()
            assert messages[0]["content"] == "Hello from HTTP"
            assert (await client.post("/api/auth/logout")).status_code == 204
            assert (await client.get("/api/me")).status_code == 401
    finally:
        server.should_exit = True
        await asyncio.to_thread(thread.join, 5)
        listener.close()
        assert not thread.is_alive()
