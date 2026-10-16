"""Isolated application fixtures; no real database or paid API is used."""

from collections.abc import AsyncIterator

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.api.dependencies import get_llm_client
from app.core.config import Settings
from app.main import create_app
from tests.fakes import MockLLMClient


@pytest.fixture
def application() -> FastAPI:
    """Isolate routes, settings and dependency overrides for each test."""
    application = create_app(Settings())
    application.dependency_overrides[get_llm_client] = MockLLMClient
    return application


@pytest.fixture
async def client(application: FastAPI) -> AsyncIterator[AsyncClient]:
    """Call the ASGI app without external servers or lifespan resources."""
    async with AsyncClient(
        transport=ASGITransport(app=application), base_url="http://testserver"
    ) as test_client:
        yield test_client


@pytest.fixture
def anyio_backend() -> str:
    """Use asyncio for asynchronous service unit tests."""
    return "asyncio"
