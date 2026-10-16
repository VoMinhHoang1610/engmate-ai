"""Private roleplay history and durable, idempotent AI turn lifecycles."""

import asyncio
from collections.abc import AsyncGenerator
from dataclasses import dataclass
from pathlib import Path
from time import perf_counter
from typing import cast
from uuid import uuid4

from fastapi import HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import func, select

from app.db.database import Record
from app.db.repository import Repository
from app.llm.base import ContextMessage, LLMClient
from app.schemas.ai import Level
from app.schemas.chat import ConversationCreate, MessageCreate
from app.services.base import PersistenceService
from app.services.common import (
    finish_session,
    now,
    owned,
    public,
    require_open,
    start_session,
)

PROMPT_VERSION = "persona.v3"
PROMPT_PATH = Path(__file__).resolve().parents[1] / "prompts" / f"{PROMPT_VERSION}.txt"


@dataclass
class PendingTurn:
    """Detached context for the provider call after the reservation is committed."""

    message: Record
    assistant: Record
    evaluation: Record
    prompt: str
    level: Level
    history: list[ContextMessage]


class ConversationService(PersistenceService):
    """Store roleplay context and prevent duplicate or overlapping turns."""

    def context(
        self, repo: Repository, identity: int, before: int = 2147483647
    ) -> list[ContextMessage]:
        """Keep recent role-typed messages within a bounded context budget."""
        table = self.db.models.table("Messages", repo.connection)
        rows = (
            repo.connection.execute(
                select(table)
                .where(
                    table.c.ConversationId == identity,
                    table.c.Status == "completed",
                    table.c.SequenceNumber < before,
                )
                .order_by(table.c.SequenceNumber.desc())
                .limit(20)
            )
            .mappings()
            .all()
        )
        result: list[ContextMessage] = []
        budget = 32000
        for row in rows:
            if row["Role"] not in ("user", "assistant"):
                continue
            text = str(row["Content"])
            if len(text) > budget:
                break
            budget -= len(text)
            result.append({"role": row["Role"], "content": text})
        return list(reversed(result))

    def voice_context(
        self, user_id: int, identity: int
    ) -> tuple[str, list[ContextMessage]]:
        """Authorize and load the same instructions/history used by text chat."""
        with self.transaction(user_id) as repo:
            conversation = owned(
                repo, "Conversations", "ConversationId", identity, user_id
            )
            require_open(repo, conversation["StudySessionId"], user_id)
            self.expire_pending(repo, user_id, identity)
            if repo.rows("Messages", ConversationId=identity, Status="pending"):
                raise HTTPException(409, "A reply is already in progress.")
            return PROMPT_PATH.read_text(
                encoding="utf-8"
            ) + f"\nLearner level: {conversation['CefrLevel']}", self.context(
                repo, identity
            )

    def start(self, user_id: int, data: ConversationCreate) -> Record:
        """Create free chat once, preserving existing schema and account data."""
        with self.transaction(user_id) as repo:
            if not self.db.mysql and data.level not in ("A2", "B1", "B2"):
                raise HTTPException(
                    422, "Level is unsupported by the SQL Server schema."
                )
            previous = repo.rows(
                "StudySessions", UserId=user_id, ClientRequestId=data.client_request_id
            )
            if previous:
                if previous[0]["ActivityType"] != "conversation":
                    raise HTTPException(409, "Request ID belongs to another activity.")
                conversation = repo.one(
                    "Conversations", StudySessionId=previous[0]["StudySessionId"]
                )
                if (conversation["CefrLevel"], conversation["Title"]) != (
                    data.level,
                    data.title,
                ):
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
                    Mode="free_chat",
                    Title=data.title,
                    CefrLevel=data.level,
                    AIRoleSnapshot="English conversation partner",
                    PromptVersion=PROMPT_VERSION,
                )
            return self.serialize(repo, conversation)

    @staticmethod
    def serialize(repo: Repository, conversation: Record) -> Record:
        """Include durable conversation state so historical chats can be resumed."""
        return {
            **public(conversation),
            "status": repo.one(
                "StudySessions", StudySessionId=conversation["StudySessionId"]
            )["Status"],
        }

    def detail(self, user_id: int, identity: int) -> Record:
        """Read only an owned conversation."""
        with self.transaction() as repo:
            return self.serialize(
                repo, owned(repo, "Conversations", "ConversationId", identity, user_id)
            )

    @staticmethod
    def expire_pending(repo: Repository, user_id: int, identity: int) -> None:
        """Recover reservations left by an interrupted process after ninety seconds."""
        for message in repo.rows(
            "Messages", ConversationId=identity, UserId=user_id, Status="pending"
        ):
            if (now() - message["CreatedAt"]).total_seconds() < 90:
                continue
            evaluation = repo.one(
                "AIEvaluations",
                MessageId=repo.one(
                    "Messages",
                    ConversationId=identity,
                    SequenceNumber=message["SequenceNumber"] - 1,
                )["MessageId"],
            )
            repo.update(
                "Messages", {"MessageId": message["MessageId"]}, {"Status": "failed"}
            )
            repo.update(
                "AIEvaluations",
                {"EvaluationId": evaluation["EvaluationId"]},
                {"Status": "failed", "CompletedAt": now()},
            )

    def history(self, user_id: int, offset: int, limit: int) -> list[Record]:
        """Read newest history and its session state in one bounded query."""
        with self.transaction() as repo:
            conversations = self.db.models.table("Conversations", repo.connection)
            sessions = self.db.models.table("StudySessions", repo.connection)
            query = (
                select(conversations, sessions.c.Status)
                .join(
                    sessions,
                    sessions.c.StudySessionId == conversations.c.StudySessionId,
                )
                .where(conversations.c.UserId == user_id)
                .order_by(conversations.c.ConversationId.desc())
                .offset(offset)
                .limit(limit)
            )
            return [
                public(dict(row)) for row in repo.connection.execute(query).mappings()
            ]

    def messages(
        self, user_id: int, identity: int, offset: int, limit: int
    ) -> list[Record]:
        """Check conversation ownership before exposing any message."""
        with self.transaction(user_id) as repo:
            owned(repo, "Conversations", "ConversationId", identity, user_id)
            self.expire_pending(repo, user_id, identity)
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
            self.expire_pending(repo, user_id, identity)
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
            sequence = int(last) + 1 if last is not None else 0
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
                Provider=self.db.settings.llm_provider,
                IsMock=self.db.settings.llm_provider == "mock",
                PromptVersion=PROMPT_VERSION,
            )
            history = self.context(repo, identity, sequence)
            prompt = PROMPT_PATH.read_text(encoding="utf-8")
            level = cast(Level, conversation["CefrLevel"])
            return PendingTurn(message, assistant, evaluation, prompt, level, history)

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
        if (
            self.db.settings.llm_provider != "mock"
            and not self.db.settings.chat_configured
        ):
            raise HTTPException(503, "OpenAI API is not configured.")
        turn = await run_in_threadpool(self.prepare, user_id, identity, data)
        if isinstance(turn, dict):
            return turn
        started = perf_counter()
        try:
            reply = await asyncio.wait_for(
                client.generate(data.message, turn.level, turn.prompt, turn.history),
                timeout=30,
            )
            if not reply.strip():
                raise ValueError("Empty provider reply")
        except asyncio.CancelledError:
            await asyncio.shield(
                run_in_threadpool(
                    self.finalize,
                    user_id,
                    turn,
                    "cancelled",
                    None,
                    int((perf_counter() - started) * 1000),
                )
            )
            raise
        except Exception as error:
            await run_in_threadpool(
                self.finalize,
                user_id,
                turn,
                "failed",
                None,
                int((perf_counter() - started) * 1000),
            )
            if isinstance(error, HTTPException):
                raise error
            raise HTTPException(
                504 if isinstance(error, TimeoutError) else 502,
                "AI reply is temporarily unavailable.",
            ) from None
        return await run_in_threadpool(
            self.finalize,
            user_id,
            turn,
            "completed",
            reply,
            int((perf_counter() - started) * 1000),
        )

    async def stream_turn(
        self, user_id: int, turn: PendingTurn | Record, client: LLMClient
    ) -> AsyncGenerator[Record, None]:
        """Stream one reserved assistant ID and atomically store final text/status."""
        if isinstance(turn, dict):
            yield {"type": "done", "turn": turn}
            return
        response_id = turn.assistant["MessageId"]
        started = perf_counter()
        output = ""
        finalized = False
        try:
            yield {
                "type": "start",
                "response_id": response_id,
                "message": public(turn.message),
                "reply": public(turn.assistant),
            }
            async with asyncio.timeout(40):
                async for delta in client.stream(
                    turn.message["Content"], turn.level, turn.prompt, turn.history
                ):
                    if not isinstance(delta, str) or len(output) + len(delta) > 12000:
                        raise ValueError("Invalid reply size")
                    output += delta
                    yield {"type": "delta", "response_id": response_id, "delta": delta}
            if not output.strip():
                raise ValueError("Empty reply")
            result = await run_in_threadpool(
                self.finalize,
                user_id,
                turn,
                "completed",
                output,
                int((perf_counter() - started) * 1000),
            )
            finalized = True
            yield {"type": "done", "response_id": response_id, "turn": result}
        except (asyncio.CancelledError, GeneratorExit):
            raise
        except Exception as error:
            await run_in_threadpool(
                self.finalize,
                user_id,
                turn,
                "failed",
                None,
                int((perf_counter() - started) * 1000),
            )
            finalized = True
            status = (
                error.status_code
                if isinstance(error, HTTPException)
                else 504 if isinstance(error, TimeoutError) else 502
            )
            yield {
                "type": "error",
                "response_id": response_id,
                "status": status,
                "message": (
                    error.detail
                    if isinstance(error, HTTPException) and status in (429, 503)
                    else "AI chưa hoàn tất phản hồi. Hãy thử lại."
                ),
            }
        finally:
            if not finalized:
                await asyncio.shield(
                    run_in_threadpool(
                        self.finalize,
                        user_id,
                        turn,
                        "cancelled",
                        None,
                        int((perf_counter() - started) * 1000),
                    )
                )

    def discard_reply(self, user_id: int, turn: PendingTurn) -> None:
        """Exclude an interrupted/unheard voice reply from future text/voice context."""
        with self.transaction(user_id) as repo:
            repo.update(
                "Messages",
                {"MessageId": turn.assistant["MessageId"]},
                {"Status": "cancelled", "Content": ""},
            )
            repo.update(
                "AIEvaluations",
                {"EvaluationId": turn.evaluation["EvaluationId"]},
                {"Status": "cancelled", "Feedback": None, "CompletedAt": now()},
            )

    def close(self, user_id: int, identity: int, abandoned: bool) -> Record:
        """Close once after outstanding replies finish; abandon credits zero time."""
        with self.transaction(user_id) as repo:
            conversation = owned(
                repo, "Conversations", "ConversationId", identity, user_id
            )
            self.expire_pending(repo, user_id, identity)
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

    def cancel(self, user_id: int, identity: int) -> Record:
        """Cancel the outstanding reply without closing the conversation."""
        with self.transaction(user_id) as repo:
            owned(repo, "Conversations", "ConversationId", identity, user_id)
            for message in repo.rows(
                "Messages", ConversationId=identity, UserId=user_id, Status="pending"
            ):
                user_message = repo.one(
                    "Messages",
                    ConversationId=identity,
                    SequenceNumber=message["SequenceNumber"] - 1,
                    UserId=user_id,
                )
                evaluation = repo.one(
                    "AIEvaluations", MessageId=user_message["MessageId"], UserId=user_id
                )
                repo.update(
                    "Messages",
                    {"MessageId": message["MessageId"]},
                    {"Status": "cancelled"},
                )
                repo.update(
                    "AIEvaluations",
                    {"EvaluationId": evaluation["EvaluationId"]},
                    {"Status": "cancelled", "CompletedAt": now()},
                )
            return {"status": "cancelled"}
