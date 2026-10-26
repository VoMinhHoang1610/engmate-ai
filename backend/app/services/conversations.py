"""Private roleplay history and durable, idempotent AI turn lifecycles."""

import asyncio
import json
from collections.abc import AsyncGenerator
from dataclasses import dataclass
from pathlib import Path
from time import perf_counter
from typing import cast
from uuid import uuid4

from fastapi import HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import func, select

from app.core.prompts import read_prompt
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
from app.services.voice_identity import voice_instructions

PROMPT_VERSION = "persona.v6"
PROMPT_PATH = Path(__file__).resolve().parents[1] / "prompts" / f"{PROMPT_VERSION}.txt"
TEXT_CONTEXT_MESSAGES = 20
VOICE_CONTEXT_MESSAGES = 12
TEXT_CONTEXT_CHARS = 32000
VOICE_CONTEXT_CHARS = 12000


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
        self,
        repo: Repository,
        identity: int,
        before: int = 2147483647,
        voice: bool = False,
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
                .limit(VOICE_CONTEXT_MESSAGES if voice else TEXT_CONTEXT_MESSAGES)
            )
            .mappings()
            .all()
        )
        result: list[ContextMessage] = []
        deliveries: dict[int, int] = {}
        if voice and rows:
            evaluations = self.db.models.table("AIEvaluations", repo.connection)
            # Evaluations point to the learner message; map paired assistant sequence.
            query = (
                select(table.c.SequenceNumber, evaluations.c.ResultJson)
                .join(evaluations, evaluations.c.MessageId == table.c.MessageId)
                .where(
                    table.c.ConversationId == identity,
                    table.c.SequenceNumber.in_(
                        [
                            row["SequenceNumber"] - 1
                            for row in rows
                            if row["Role"] == "assistant"
                        ]
                    ),
                )
            )
            for sequence, raw in repo.connection.execute(query):
                data = json.loads(raw) if isinstance(raw, str) else raw
                if isinstance(data, dict) and data.get("voice_delivery") is True:
                    deliveries[sequence + 1] = int(data.get("heard_chars", 0))
        budget = VOICE_CONTEXT_CHARS if voice else TEXT_CONTEXT_CHARS
        for row in rows:
            if row["Role"] not in ("user", "assistant"):
                continue
            text = str(row["Content"])
            if row["SequenceNumber"] in deliveries:
                text = text[: deliveries[row["SequenceNumber"]]]
                if not text.strip():
                    continue
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
            prompt = read_prompt(PROMPT_PATH)
            if conversation["PromptVersion"] == "toeic.v1":
                from app.services.learning import learning_context

                prompt += learning_context(repo, user_id, identity)
            return (
                prompt + f"\nLearner level: {conversation['CefrLevel']}",
                self.context(repo, identity, voice=True),
            )

    def start(self, user_id: int, data: ConversationCreate) -> Record:
        """Create free chat once, preserving existing schema and account data."""
        if data.lesson_id is not None:
            from app.services.curriculum import find_lesson

            stage, lesson = find_lesson(data.lesson_id)
            data = data.model_copy(update={"level": stage.level, "title": lesson.title})
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
                if (conversation["PromptVersion"] == "toeic.v1") != (
                    data.lesson_id is not None
                ):
                    raise HTTPException(409, "Request ID belongs to another activity.")
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
                    AIRoleSnapshot=(
                        "Mate: guided voice lesson"
                        if data.lesson_id is not None
                        else "English conversation partner"
                    ),
                    PromptVersion=(
                        "toeic.v1" if data.lesson_id is not None else PROMPT_VERSION
                    ),
                )
            if data.lesson_id is not None:
                from app.services.learning import bind_lesson

                bind_lesson(
                    repo, user_id, conversation["ConversationId"], data.lesson_id
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
        self,
        user_id: int,
        identity: int,
        offset: int,
        limit: int,
        after_id: int | None = None,
        before_id: int | None = None,
        latest: bool = False,
    ) -> list[Record]:
        """Check conversation ownership before exposing any message."""
        with self.transaction(user_id) as repo:
            owned(repo, "Conversations", "ConversationId", identity, user_id)
            self.expire_pending(repo, user_id, identity)
            if after_id is not None or before_id is not None or latest:
                table = self.db.models.table("Messages", repo.connection)
                query = select(table).where(
                    table.c.ConversationId == identity, table.c.UserId == user_id
                )
                if after_id is not None:
                    query = query.where(table.c.MessageId > after_id)
                if before_id is not None:
                    query = query.where(table.c.MessageId < before_id)
                backwards = latest or before_id is not None
                query = query.order_by(
                    table.c.MessageId.desc() if backwards else table.c.MessageId
                ).limit(limit)
                rows = [
                    public(dict(row))
                    for row in repo.connection.execute(query).mappings()
                ]
                return list(reversed(rows)) if backwards else rows
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
                metadata = evaluation.get("ResultJson")
                metadata = (
                    json.loads(metadata) if isinstance(metadata, str) else metadata
                )
                if (
                    bool(isinstance(metadata, dict) and metadata.get("voice_delivery"))
                    != data.voice
                ):
                    raise HTTPException(
                        409, "Request ID was used with a different input mode."
                    )
                previous_gender = (
                    metadata.get("voice_gender") if isinstance(metadata, dict) else None
                )
                if previous_gender != data.voice_gender:
                    raise HTTPException(
                        409, "Request ID was used with a different voice identity."
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
                ResultJson=(
                    json.dumps(
                        {
                            "voice_delivery": True,
                            "heard_chars": 0,
                            "voice_gender": data.voice_gender,
                        }
                    )
                    if data.voice
                    else None
                ),
            )
            history = self.context(repo, identity, sequence, voice=data.voice)
            prompt = read_prompt(PROMPT_PATH)
            if conversation["PromptVersion"] == "toeic.v1":
                from app.services.learning import learning_context

                prompt += learning_context(repo, user_id, identity, data.message)
            if data.voice:
                prompt += voice_instructions(data.voice_gender)
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

    def playback(
        self, user_id: int, identity: int, response_id: int, heard_chars: int
    ) -> Record:
        """Advance only an owned voice reply's prefix, preserving its visible text."""
        with self.transaction(user_id) as repo:
            owned(repo, "Conversations", "ConversationId", identity, user_id)
            reply = repo.one(
                "Messages",
                MessageId=response_id,
                ConversationId=identity,
                UserId=user_id,
            )
            if reply["Role"] != "assistant":
                raise HTTPException(422, "Playback requires an assistant response.")
            learner = repo.one(
                "Messages",
                ConversationId=identity,
                UserId=user_id,
                SequenceNumber=reply["SequenceNumber"] - 1,
            )
            evaluation = repo.one(
                "AIEvaluations", MessageId=learner["MessageId"], UserId=user_id
            )
            raw = evaluation.get("ResultJson")
            data = json.loads(raw) if isinstance(raw, str) else raw
            if not isinstance(data, dict) or data.get("voice_delivery") is not True:
                raise HTTPException(
                    409, "Response was not generated for voice playback."
                )
            if reply["Status"] != "completed":
                return {"heard_chars": int(data.get("heard_chars", 0))}
            if heard_chars > len(reply["Content"]):
                raise HTTPException(422, "Playback exceeds generated content.")
            # A late old receipt must not rewrite context after a newer turn starts.
            table = self.db.models.table("Messages", repo.connection)
            newer = repo.connection.execute(
                select(table.c.MessageId)
                .where(
                    table.c.ConversationId == identity,
                    table.c.SequenceNumber > reply["SequenceNumber"],
                )
                .limit(1)
            ).first()
            previous = int(data.get("heard_chars", 0))
            if newer is None and heard_chars > previous:
                data["heard_chars"] = heard_chars
                repo.update(
                    "AIEvaluations",
                    {"EvaluationId": evaluation["EvaluationId"]},
                    {"ResultJson": json.dumps(data)},
                )
                previous = heard_chars
            return {"heard_chars": previous}

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
