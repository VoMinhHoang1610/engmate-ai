"""Private roleplay history and durable, idempotent AI turn lifecycles."""

import asyncio
from dataclasses import dataclass
from time import perf_counter
from typing import cast
from uuid import uuid4

from fastapi import HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import func, select

from app.db.database import Record
from app.db.repository import Repository
from app.llm.base import LLMClient
from app.schemas.ai import Level
from app.schemas.learning import ConversationCreate, MessageCreate
from app.services.ai_service import PROMPT_PATH, PROMPT_VERSION
from app.services.common import (
    finish_session,
    now,
    owned,
    public,
    require_open,
    start_session,
)
from app.services.learning import LearningService


@dataclass
class PendingTurn:
    """Detached context for the provider call after the reservation is committed."""

    message: Record
    assistant: Record
    evaluation: Record
    prompt: str
    level: Level


class ConversationService(LearningService):
    """Store roleplay context and prevent duplicate or overlapping turns."""

    def start(self, user_id: int, data: ConversationCreate) -> Record:
        """Snapshot topic role and learner level at conversation creation."""
        with self.transaction(user_id) as repo:
            topic = (
                repo.one("Topics", Code=data.topic_code, IsActive=True)
                if data.topic_code
                else None
            )
            levels = {"A2": 0, "B1": 1, "B2": 2}
            if (
                topic
                and not levels[topic["MinLevel"]]
                <= levels[data.level]
                <= levels[topic["MaxLevel"]]
            ):
                raise HTTPException(422, "Topic does not support this level.")
            previous = repo.rows(
                "StudySessions", UserId=user_id, ClientRequestId=data.client_request_id
            )
            if previous:
                if previous[0]["ActivityType"] != "conversation":
                    raise HTTPException(409, "Request ID belongs to another activity.")
                conversation = repo.one(
                    "Conversations", StudySessionId=previous[0]["StudySessionId"]
                )
                if (
                    conversation["TopicId"],
                    conversation["CefrLevel"],
                    conversation["Title"],
                ) != (topic["TopicId"] if topic else None, data.level, data.title):
                    raise HTTPException(
                        409, "Request ID was used with different input."
                    )
            else:
                session = start_session(
                    repo, user_id, data.client_request_id, "conversation"
                )
                conversation = repo.insert(
                    "Conversations",
                    UserId=user_id,
                    StudySessionId=session["StudySessionId"],
                    TopicId=topic["TopicId"] if topic else None,
                    Mode="roleplay" if topic else "free_chat",
                    Title=data.title,
                    CefrLevel=data.level,
                    AIRoleSnapshot=(
                        topic["AIRole"] if topic else "English conversation partner"
                    ),
                    PromptVersion=PROMPT_VERSION,
                )
                repo.insert(
                    "Messages",
                    UserId=user_id,
                    ConversationId=conversation["ConversationId"],
                    ClientRequestId=uuid4(),
                    SequenceNumber=0,
                    Role="assistant",
                    Content=(
                        topic["OpeningMessage"]
                        if topic
                        else "Hello! What would you like to practise today?"
                    ),
                )
            return public(conversation)

    def history(self, user_id: int, offset: int, limit: int) -> list[Record]:
        """List private conversations with deterministic pagination."""
        with self.transaction() as repo:
            return [
                public(row)
                for row in repo.page(
                    "Conversations", "ConversationId", offset, limit, UserId=user_id
                )
            ]

    def messages(
        self, user_id: int, identity: int, offset: int, limit: int
    ) -> list[Record]:
        """Check conversation ownership before exposing any message."""
        with self.transaction() as repo:
            owned(repo, "Conversations", "ConversationId", identity, user_id)
            return [
                public(row)
                for row in repo.page(
                    "Messages",
                    "SequenceNumber",
                    offset,
                    limit,
                    ConversationId=identity,
                    UserId=user_id,
                )
            ]

    @staticmethod
    def turn_result(repo: Repository, message: Record, evaluation: Record) -> Record:
        """Find the assistant slot reserved for this user message."""
        assistant = repo.one(
            "Messages",
            ConversationId=message["ConversationId"],
            SequenceNumber=message["SequenceNumber"] + 1,
            UserId=message["UserId"],
        )
        return {
            "message": public(message),
            "reply": public(assistant),
            "evaluation": public(evaluation),
        }

    def prepare(
        self, user_id: int, identity: int, data: MessageCreate
    ) -> PendingTurn | Record:
        """Reserve a turn in a worker thread and commit before contacting AI."""
        with self.transaction(user_id) as repo:
            conversation = owned(
                repo, "Conversations", "ConversationId", identity, user_id
            )
            previous = repo.rows(
                "Messages",
                ConversationId=identity,
                ClientRequestId=data.client_request_id,
                UserId=user_id,
            )
            if previous:
                message = previous[0]
                if message["Role"] != "user" or message["Content"] != data.message:
                    raise HTTPException(
                        409, "Request ID was used with different input."
                    )
                evaluation = repo.one(
                    "AIEvaluations", MessageId=message["MessageId"], UserId=user_id
                )
                return self.turn_result(repo, message, evaluation)
            require_open(repo, conversation["StudySessionId"], user_id)
            if repo.rows("Messages", ConversationId=identity, Status="pending"):
                raise HTTPException(409, "A reply is already in progress.")
            table = self.db.models.table("Messages", repo.connection)
            last = repo.connection.execute(
                select(func.max(table.c.SequenceNumber)).where(
                    table.c.ConversationId == identity
                )
            ).scalar_one()
            sequence = int(last) + 1
            message = repo.insert(
                "Messages",
                UserId=user_id,
                ConversationId=identity,
                ClientRequestId=data.client_request_id,
                SequenceNumber=sequence,
                Role="user",
                Content=data.message,
            )
            assistant = repo.insert(
                "Messages",
                UserId=user_id,
                ConversationId=identity,
                ClientRequestId=uuid4(),
                SequenceNumber=sequence + 1,
                Role="assistant",
                Content="",
                Status="pending",
            )
            evaluation = repo.insert(
                "AIEvaluations",
                UserId=user_id,
                MessageId=message["MessageId"],
                ClientRequestId=data.client_request_id,
                Provider="mock",
                IsMock=True,
                PromptVersion=conversation["PromptVersion"],
            )
            recent = (
                repo.connection.execute(
                    select(table)
                    .where(
                        table.c.ConversationId == identity,
                        table.c.Status == "completed",
                    )
                    .order_by(table.c.SequenceNumber.desc())
                    .limit(20)
                )
                .mappings()
                .all()
            )
            context = "\n".join(
                f"{row['Role']}: {row['Content']}" for row in reversed(recent)
            )
            prompt = (
                PROMPT_PATH.read_text(encoding="utf-8")
                + "\nRole: "
                + conversation["AIRoleSnapshot"]
                + "\nHistory:\n"
                + context
            )
            level = cast(Level, conversation["CefrLevel"])
            return PendingTurn(message, assistant, evaluation, prompt, level)

    def finalize(
        self,
        user_id: int,
        turn: PendingTurn,
        status: str,
        reply: str | None,
        latency: int,
    ) -> Record:
        """Finalize both records atomically, respecting a learner's cancellation."""
        with self.transaction(user_id) as repo:
            evaluation = owned(
                repo,
                "AIEvaluations",
                "EvaluationId",
                turn.evaluation["EvaluationId"],
                user_id,
            )
            if evaluation["Status"] == "pending":
                values: Record = {"Status": status}
                if reply is not None:
                    values["Content"] = reply
                repo.update(
                    "Messages", {"MessageId": turn.assistant["MessageId"]}, values
                )
                evaluation = repo.update(
                    "AIEvaluations",
                    {"EvaluationId": evaluation["EvaluationId"]},
                    {
                        "Feedback": reply,
                        "Status": status,
                        "CompletedAt": now(),
                        "LatencyMs": latency,
                    },
                )
            return self.turn_result(repo, turn.message, evaluation)

    async def send(
        self, user_id: int, identity: int, data: MessageCreate, client: LLMClient
    ) -> Record:
        """Run SQL off the event loop and bound AI latency without holding a lock."""
        turn = await run_in_threadpool(self.prepare, user_id, identity, data)
        if isinstance(turn, dict):
            return turn
        started = perf_counter()
        try:
            reply = await asyncio.wait_for(
                client.generate(data.message, turn.level, turn.prompt), timeout=30
            )
            if not reply.strip():
                raise ValueError("Empty provider reply")
        except Exception:
            await run_in_threadpool(
                self.finalize,
                user_id,
                turn,
                "failed",
                None,
                int((perf_counter() - started) * 1000),
            )
            raise HTTPException(502, "AI reply is temporarily unavailable.") from None
        return await run_in_threadpool(
            self.finalize,
            user_id,
            turn,
            "completed",
            reply,
            int((perf_counter() - started) * 1000),
        )

    def close(self, user_id: int, identity: int, abandoned: bool) -> Record:
        """Close once after outstanding replies finish; abandon credits zero time."""
        with self.transaction(user_id) as repo:
            conversation = owned(
                repo, "Conversations", "ConversationId", identity, user_id
            )
            if repo.rows("Messages", ConversationId=identity, Status="pending"):
                raise HTTPException(409, "Wait for the pending reply before closing.")
            session = owned(
                repo,
                "StudySessions",
                "StudySessionId",
                conversation["StudySessionId"],
                user_id,
            )
            return public(finish_session(repo, session, abandoned))
