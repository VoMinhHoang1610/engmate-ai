"""Private account and conversation resources for the chat-only application."""

import asyncio
import json
from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request, Response
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, select

from app.api.dependencies import get_llm_client
from app.core.config import Settings
from app.db.database import Record
from app.llm.base import LLMClient
from app.schemas.chat import (
    MAX_ID,
    ConversationCreate,
    Login,
    MessageCreate,
    Refresh,
    Register,
)
from app.schemas.responses import (
    AccountResponse,
    ConversationResponse,
    MessageResponse,
    TokensResponse,
    TurnResponse,
)
from app.services.auth import AuthService
from app.services.conversations import ConversationService, PendingTurn

router = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)
Identity = Annotated[int, Path(gt=0, le=MAX_ID)]
Offset = Annotated[int, Query(ge=0, le=2147483647)]
Limit = Annotated[int, Query(ge=1, le=100)]


def auth_service(request: Request) -> AuthService:
    """Resolve the app-scoped database and signing settings."""
    return AuthService(request.app.state.database, request.app.state.settings)


def conversation_service(request: Request) -> ConversationService:
    """Resolve account-owned history and provider job state."""
    return ConversationService(request.app.state.database)


Auth = Annotated[AuthService, Depends(auth_service)]
Conversations = Annotated[ConversationService, Depends(conversation_service)]
AI = Annotated[LLMClient, Depends(get_llm_client)]


def current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    service: Auth,
) -> Record:
    """Validate bearer purpose and immediate database session revocation."""
    if credentials is None:
        raise HTTPException(
            401, "A bearer token is required.", headers={"WWW-Authenticate": "Bearer"}
        )
    return service.authenticate(credentials.credentials)


User = Annotated[Record, Depends(current_user)]


@router.get("/ready", tags=["health"])
def ready(request: Request) -> Record:
    """Check only chat tables; provider readiness is separate from liveness."""
    database = request.app.state.database
    with database.transaction() as connection:
        table = database.models.table("SchemaVersions", connection)
        version = connection.execute(select(func.max(table.c.Version))).scalar_one()
        if version != 1:
            raise HTTPException(503, "Unsupported database schema version.")
        for name in database.models.table_names:
            database.models.table(name, connection)
    settings: Settings = request.app.state.settings
    if settings.llm_provider != "mock" and not settings.chat_configured:
        raise HTTPException(503, "OpenAI API is not configured.")
    return {
        "status": "ok",
        "database": "mysql" if database.mysql else "sqlserver",
        "schema_version": version,
        "provider": settings.llm_provider,
        "is_mock": settings.llm_provider == "mock",
    }


@router.post(
    "/auth/register", status_code=201, tags=["auth"], response_model=TokensResponse
)
def register(data: Register, service: Auth) -> Record:
    """Create an account and its first revocable session atomically."""
    return service.register(data)


@router.post("/auth/login", tags=["auth"], response_model=TokensResponse)
def login(data: Login, service: Auth) -> Record:
    """Authenticate a real account; no browser-only credentials are accepted."""
    return service.login(data)


@router.post("/auth/refresh", tags=["auth"], response_model=TokensResponse)
def refresh(data: Refresh, service: Auth) -> Record:
    """Rotate a one-use refresh token under the account mutation lock."""
    return service.refresh(data.refresh_token)


@router.post("/auth/logout", status_code=204, tags=["auth"])
async def logout(
    user: User, service: Auth, request: Request, all_sessions: bool = False
) -> Response:
    """Revoke the selected account's current or all sessions."""
    await request.app.state.voice.shutdown(user["UserId"])
    for key, task in list(request.app.state.chat_jobs.items()):
        if key[0] == user["UserId"]:
            task.cancel()
    await run_in_threadpool(service.logout, user, all_sessions)
    return Response(status_code=204)


@router.get("/me", tags=["account"], response_model=AccountResponse)
def me(user: User, service: Auth) -> Record:
    """Return only safe account identity fields."""
    return service.user_public(user)


@router.post(
    "/conversations",
    status_code=201,
    tags=["conversations"],
    response_model=ConversationResponse,
)
def start_conversation(
    data: ConversationCreate, user: User, service: Conversations
) -> Record:
    """Create a free conversation once for its request ID."""
    return service.start(user["UserId"], data)


@router.get(
    "/conversations", tags=["conversations"], response_model=list[ConversationResponse]
)
def conversations(
    user: User, service: Conversations, offset: Offset = 0, limit: Limit = 50
) -> list[Record]:
    """Return newest conversations first, with stable pagination."""
    return service.history(user["UserId"], offset, limit)


@router.get(
    "/conversations/{identity}",
    tags=["conversations"],
    response_model=ConversationResponse,
)
def conversation(identity: Identity, user: User, service: Conversations) -> Record:
    """Return conversation metadata and its open/closed state."""
    return service.detail(user["UserId"], identity)


@router.get(
    "/conversations/{identity}/messages",
    tags=["conversations"],
    response_model=list[MessageResponse],
)
def messages(
    identity: Identity,
    user: User,
    service: Conversations,
    offset: Offset = 0,
    limit: Limit = 50,
) -> list[Record]:
    """Read a chronological page after checking ownership."""
    return service.messages(user["UserId"], identity, offset, limit)


@router.post(
    "/conversations/{identity}/messages",
    tags=["conversations"],
    response_model=TurnResponse,
)
async def send_message(
    identity: Identity,
    data: MessageCreate,
    user: User,
    service: Conversations,
    ai: AI,
    request: Request,
) -> Record:
    """Persist one idempotent turn and return its durable provider status."""
    request.app.state.voice.ensure_text_available(user["UserId"], identity)
    key = (user["UserId"], identity)
    task = asyncio.current_task()
    # Never replace an existing stream's cancellation handle on an idempotent retry.
    registered = key not in request.app.state.chat_jobs
    if registered:
        request.app.state.chat_jobs[key] = task
    try:
        return await service.send(user["UserId"], identity, data, ai)
    finally:
        if registered and request.app.state.chat_jobs.get(key) is task:
            request.app.state.chat_jobs.pop(key, None)


@router.post("/conversations/{identity}/messages/stream", tags=["conversations"])
async def stream_message(
    identity: Identity,
    data: MessageCreate,
    user: User,
    service: Conversations,
    ai: AI,
    request: Request,
) -> StreamingResponse:
    """Authenticate and reserve before headers, then deliver SSE with durable IDs."""
    uid = user["UserId"]
    request.app.state.voice.ensure_text_available(uid, identity)
    turn = await run_in_threadpool(service.prepare, uid, identity, data)

    async def events() -> AsyncIterator[str]:
        task = asyncio.current_task()
        key = (uid, identity)
        if isinstance(turn, PendingTurn):
            request.app.state.chat_jobs[key] = task
        try:
            async for event in service.stream_turn(uid, turn, ai):
                if event["type"] == "start":
                    for name in ("message", "reply"):
                        event[name] = MessageResponse.model_validate(
                            event[name]
                        ).model_dump(mode="json")
                elif event["type"] == "done":
                    event["turn"] = TurnResponse.model_validate(
                        event["turn"]
                    ).model_dump(mode="json")
                yield "data: " + json.dumps(event, ensure_ascii=False) + "\n\n"
        finally:
            if request.app.state.chat_jobs.get(key) is task:
                request.app.state.chat_jobs.pop(key, None)

    return StreamingResponse(
        events(), media_type="text/event-stream", headers={"X-Accel-Buffering": "no"}
    )


@router.post("/conversations/{identity}/close", tags=["conversations"])
def close_conversation(
    identity: Identity, user: User, service: Conversations, request: Request
) -> Record:
    """Close an owned conversation idempotently."""
    request.app.state.voice.ensure_text_available(user["UserId"], identity)
    return service.close(user["UserId"], identity, False)


@router.post("/conversations/{identity}/cancel", tags=["conversations"])
async def cancel(
    identity: Identity, user: User, service: Conversations, request: Request
) -> Record:
    """Cancel a reserved reply; late provider results cannot revive it."""
    result = await run_in_threadpool(service.cancel, user["UserId"], identity)
    task = request.app.state.chat_jobs.get((user["UserId"], identity))
    if task:
        task.cancel()
    return result
