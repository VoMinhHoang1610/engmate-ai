"""Explicit public REST responses; legacy learning fields stay private."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class AccountResponse(BaseModel):
    """Safe account identity without SQL internals or credential hashes."""

    public_id: str
    username: str
    email: str
    status: str
    email_verified_at: datetime | None
    version: str


class TokensResponse(BaseModel):
    """A revocable access/refresh pair returned only to its authenticated owner."""

    access_token: str
    refresh_token: str
    token_type: Literal["bearer"]
    expires_in: int
    user: AccountResponse


class ConversationResponse(BaseModel):
    """Minimal conversation metadata used by the sidebar and chat screen."""

    conversation_id: int
    title: str
    status: Literal["in_progress", "completed", "abandoned"]
    created_at: datetime


class MessageResponse(BaseModel):
    """Durable text and lifecycle state; no hidden prompt or provider secret."""

    message_id: int
    role: Literal["user", "assistant", "system"]
    content: str
    status: Literal["pending", "completed", "failed", "cancelled"]
    created_at: datetime


class JobResponse(BaseModel):
    """Reply generation status without the removed assessment/score fields."""

    status: Literal["pending", "completed", "failed", "cancelled"]
    provider: str
    is_mock: bool


class TurnResponse(BaseModel):
    """One idempotent user turn and its reserved assistant reply."""

    message: MessageResponse
    reply: MessageResponse
    evaluation: JobResponse
