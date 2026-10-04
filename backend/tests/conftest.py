"""Isolated application fixtures; no real database or paid API is used."""

from collections.abc import AsyncIterator

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings
from app.main import create_app


@pytest.fixture
def application() -> FastAPI:
    """Isolate routes, settings and dependency overrides for each test."""
    return create_app(Settings())


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
