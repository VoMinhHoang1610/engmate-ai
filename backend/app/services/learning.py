"""Persist voice-led lesson plans, ownership and verifiable learning evidence."""

import hashlib
import json
from datetime import UTC, timedelta
from pathlib import Path
from typing import Any

from fastapi import HTTPException
from sqlalchemy import Connection, Table, and_, select

from app.core.prompts import read_prompt
from app.db.database import Database, Record
from app.db.learning import bindings, plans, progress, receipts
from app.db.repository import Repository
from app.schemas.chat import ConversationCreate
from app.schemas.learning import (
    CheckSubmission,
    LessonStart,
    PhaseUpdate,
    PlanUpdate,
)
from app.services.base import PersistenceService
from app.services.common import now, owned
from app.services.curriculum import all_lessons, course, find_lesson

LESSON_PROMPT_VERSION = "toeic.v1"
LESSON_PROMPT_PATH = Path(__file__).resolve().parents[1] / "prompts" / "lesson.v1.txt"
MIN_PRACTICE_TURNS = 3
GOAL_STAGE_INDEX = {450: 1, 650: 2, 800: 3, 900: 4, 990: 4}
NEXT_COMMANDS = (
    "mate, bước tiếp theo",
    "mate bước tiếp theo",
    "mate next step",
    "mate, next step",
)
PREVIOUS_COMMANDS = (
    "mate quay lại",
    "mate, quay lại",
    "mate previous step",
    "mate, previous step",
)


def _command(message: str) -> str:
    """Normalize only explicit navigation commands, never learner answers."""
    return " ".join(message.casefold().strip(" .!?").split())


def _row(connection: Connection, table: Table, **filters: Any) -> Record | None:
    """Query only server-owned table definitions and parameterized values."""
    statement = select(table)
    for key, value in filters.items():
        statement = statement.where(table.c[key] == value)
    row = connection.execute(statement).mappings().first()
    return dict(row) if row is not None else None


def _update(connection: Connection, table: Table, user_id: int, **values: Any) -> None:
    """Update an explicitly owned learning record inside the owner lock."""
    statement = table.update().where(table.c.UserId == user_id)
    if "LessonId" in values:
        lesson_id = values.pop("LessonId")
        statement = statement.where(table.c.LessonId == lesson_id)
    connection.execute(statement.values(**values))


def bind_lesson(
    repo: Repository, user_id: int, conversation_id: int, lesson_id: str
) -> None:
    """Bind a canonical lesson to an owned conversation once, under its lock."""
    find_lesson(lesson_id)
    owned(repo, "Conversations", "ConversationId", conversation_id, user_id)
    existing = _row(
        repo.connection, bindings, UserId=user_id, ConversationId=conversation_id
    )
    if existing is not None and existing["LessonId"] != lesson_id:
        raise HTTPException(409, "Conversation belongs to another lesson.")
    if existing is None:
        repo.connection.execute(
            bindings.insert().values(
                UserId=user_id, ConversationId=conversation_id, LessonId=lesson_id
            )
        )
    previous = _row(repo.connection, progress, UserId=user_id, LessonId=lesson_id)
    if previous is None:
        repo.connection.execute(
            progress.insert().values(
                UserId=user_id,
                LessonId=lesson_id,
                ConversationId=conversation_id,
                Phase=0,
                Completed=False,
                CheckCorrect=0,
                CheckTotal=0,
                ReviewDue=None,
            )
        )
    elif previous["ConversationId"] != conversation_id:
        _update(
            repo.connection,
            progress,
            user_id,
            LessonId=lesson_id,
            ConversationId=conversation_id,
        )


def practice_counts(
    repo: Repository, user_id: int, conversation_id: int | None = None
) -> dict[int, int]:
    """Count only paired completed learner/assistant turns, never pending replies."""
    messages = repo.database.models.table("Messages", repo.connection)
    learner = messages.alias("learning_learner")
    teacher = messages.alias("learning_teacher")
    statement = (
        select(learner.c.ConversationId, learner.c.Content)
        .join(
            teacher,
            and_(
                teacher.c.ConversationId == learner.c.ConversationId,
                teacher.c.UserId == learner.c.UserId,
                teacher.c.SequenceNumber == learner.c.SequenceNumber + 1,
            ),
        )
        .join(
            bindings,
            and_(
                bindings.c.UserId == learner.c.UserId,
                bindings.c.ConversationId == learner.c.ConversationId,
            ),
        )
        .join(
            progress,
            and_(
                progress.c.UserId == bindings.c.UserId,
                progress.c.LessonId == bindings.c.LessonId,
                progress.c.ConversationId == learner.c.ConversationId,
            ),
        )
        .where(
            learner.c.UserId == user_id,
            learner.c.Role == "user",
            learner.c.Status == "completed",
            teacher.c.Role == "assistant",
            teacher.c.Status == "completed",
            learner.c.Content != "",
            teacher.c.Content != "",
        )
    )
    if conversation_id is not None:
        statement = statement.where(learner.c.ConversationId == conversation_id)
    counts: dict[int, int] = {}
    for identity, content in repo.connection.execute(statement):
        if _command(content) not in (*NEXT_COMMANDS, *PREVIOUS_COMMANDS):
            counts[int(identity)] = counts.get(int(identity), 0) + 1
    return counts


def _progress(row: Record, counts: dict[int, int]) -> Record:
    """Expose only measured evidence and safe lesson identifiers."""
    due = row["ReviewDue"]
    return {
        "lesson_id": row["LessonId"],
        "conversation_id": row["ConversationId"],
        "phase": row["Phase"],
        "practice_turns": counts.get(row["ConversationId"], 0),
        "completed": bool(row["Completed"]),
        "check_correct": row["CheckCorrect"],
        "check_total": row["CheckTotal"],
        "review_due": due.replace(tzinfo=UTC).isoformat() if due else None,
    }


def learning_context(
    repo: Repository, user_id: int, conversation_id: int, message: str | None = None
) -> str:
    """Compose trusted lesson context, advancing phases only on explicit commands."""
    binding = _row(
        repo.connection, bindings, UserId=user_id, ConversationId=conversation_id
    )
    if binding is None:
        return ""
    lesson_id = str(binding["LessonId"])
    _, lesson = find_lesson(lesson_id)
    row = _row(repo.connection, progress, UserId=user_id, LessonId=lesson_id)
    assert row is not None
    phase = int(row["Phase"])
    command = _command(message or "")
    if row["ConversationId"] == conversation_id:
        if command in NEXT_COMMANDS:
            phase = min(4, phase + 1)
        elif command in PREVIOUS_COMMANDS:
            phase = max(0, phase - 1)
        if phase != row["Phase"]:
            _update(repo.connection, progress, user_id, LessonId=lesson_id, Phase=phase)
    material = lesson.model_dump(exclude={"checks"})
    payload = {"phase": phase, "lesson": material}
    return (
        "\n"
        + read_prompt(LESSON_PROMPT_PATH)
        + "\n"
        + json.dumps(payload, ensure_ascii=False)
    )


class LearningService(PersistenceService):
    """Keep one durable course plan and lesson evidence per authenticated account."""

    @staticmethod
    def _plan(row: Record | None) -> Record:
        if row is None:
            return {
                "version": 0,
                "goal_score": 650,
                "start_stage": course().stages[0].id,
                "minutes": 15,
                "exam_date": None,
            }
        return {
            "version": row["Version"],
            "goal_score": row["GoalScore"],
            "start_stage": row["StartStage"],
            "minutes": row["Minutes"],
            "exam_date": row["ExamDate"],
        }

    def plan(self, user_id: int) -> Record:
        """Return saved preferences or explicit, unsaved defaults."""
        with self.transaction() as repo:
            return self._plan(_row(repo.connection, plans, UserId=user_id))

    def save_plan(self, user_id: int, data: PlanUpdate) -> Record:
        """Reject stale plan writes without changing account profile or exam scores."""
        if data.start_stage not in {stage.id for stage in course().stages}:
            raise HTTPException(422, "Unknown starting stage.")
        stages = [stage.id for stage in course().stages]
        if stages.index(data.start_stage) > GOAL_STAGE_INDEX[data.goal_score]:
            raise HTTPException(422, "Starting stage exceeds the selected goal.")
        with self.transaction(user_id) as repo:
            previous = _row(repo.connection, plans, UserId=user_id)
            expected = previous["Version"] if previous else 0
            if data.version != expected:
                raise HTTPException(409, "Plan changed; reload before saving.")
            values = {
                "Version": expected + 1,
                "GoalScore": data.goal_score,
                "StartStage": data.start_stage,
                "Minutes": data.minutes,
                "ExamDate": data.exam_date,
            }
            if previous:
                _update(repo.connection, plans, user_id, **values)
            else:
                repo.connection.execute(plans.insert().values(UserId=user_id, **values))
            return self._plan(_row(repo.connection, plans, UserId=user_id))

    def progress(self, user_id: int) -> Record:
        """Recommend by stage and completion while keeping every lesson browsable."""
        with self.transaction() as repo:
            saved = self._plan(_row(repo.connection, plans, UserId=user_id))
            rows = [
                dict(row)
                for row in repo.connection.execute(
                    select(progress).where(progress.c.UserId == user_id)
                ).mappings()
            ]
            counts = practice_counts(repo, user_id) if rows else {}
            completed = {row["LessonId"] for row in rows if row["Completed"]}
            stages = [stage.id for stage in course().stages]
            offset = stages.index(saved["start_stage"])
            end = GOAL_STAGE_INDEX[saved["goal_score"]]
            candidates = [
                lesson.id
                for stage, lesson in all_lessons()
                if offset <= stages.index(stage.id) <= end
            ]
            recommended = next(
                (lesson_id for lesson_id in candidates if lesson_id not in completed),
                None,
            )
            return {
                "lessons": [_progress(row, counts) for row in rows],
                "recommended_lesson_id": recommended,
                "review_lesson_ids": [
                    row["LessonId"]
                    for row in rows
                    if row["ReviewDue"] is not None and row["ReviewDue"] <= now()
                ],
            }

    @staticmethod
    def _receipt(
        repo: Repository, user_id: int, request_id: str, kind: str, payload: Record
    ) -> tuple[Record | None, str]:
        digest = hashlib.sha256(
            json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")
        ).hexdigest()
        previous = _row(repo.connection, receipts, UserId=user_id, RequestId=request_id)
        if previous:
            if previous["Kind"] != kind or previous["PayloadHash"] != digest:
                raise HTTPException(409, "Request ID was used with different input.")
            result: Record = json.loads(previous["ResultJson"])
            return result, digest
        return None, digest

    @staticmethod
    def _save_receipt(
        repo: Repository,
        user_id: int,
        request_id: str,
        kind: str,
        digest: str,
        result: Record,
    ) -> None:
        repo.connection.execute(
            receipts.insert().values(
                UserId=user_id,
                RequestId=request_id,
                Kind=kind,
                PayloadHash=digest,
                ResultJson=json.dumps(result, ensure_ascii=False),
            )
        )

    def start(self, user_id: int, lesson_id: str, data: LessonStart) -> Record:
        """Reuse an open lesson chat and make all retries durable and provider-free."""
        from app.services.conversations import ConversationService

        stage, lesson = find_lesson(lesson_id)
        request_id = str(data.client_request_id)
        with self.transaction(user_id) as repo:
            previous, digest = self._receipt(
                repo, user_id, request_id, "start", {"lesson_id": lesson_id}
            )
            if previous:
                return previous
            row = _row(repo.connection, progress, UserId=user_id, LessonId=lesson_id)
            conversation: Record | None = None
            if row and row["ConversationId"]:
                stored = owned(
                    repo,
                    "Conversations",
                    "ConversationId",
                    row["ConversationId"],
                    user_id,
                )
                serialized = ConversationService.serialize(repo, stored)
                if serialized["status"] == "in_progress":
                    conversation = serialized
            if conversation is None:
                nested = Database(self.db.settings, repo.connection)
                conversation = ConversationService(nested).start(
                    user_id,
                    ConversationCreate(
                        client_request_id=data.client_request_id,
                        title=lesson.title,
                        level=stage.level,
                        lesson_id=lesson_id,
                    ),
                )
            bind_lesson(repo, user_id, int(conversation["conversation_id"]), lesson_id)
            row = _row(repo.connection, progress, UserId=user_id, LessonId=lesson_id)
            assert row is not None
            # Apply the ordinary REST whitelist before persisting the retry receipt.
            from app.schemas.responses import ConversationResponse

            result = {
                "conversation": ConversationResponse.model_validate(
                    conversation
                ).model_dump(mode="json"),
                "progress": _progress(
                    row, practice_counts(repo, user_id, row["ConversationId"])
                ),
            }
            self._save_receipt(repo, user_id, request_id, "start", digest, result)
            return result

    def phase(self, user_id: int, lesson_id: str, data: PhaseUpdate) -> Record:
        """Allow one forward step or any backward revision in the active owned chat."""
        find_lesson(lesson_id)
        with self.transaction(user_id) as repo:
            row = _row(repo.connection, progress, UserId=user_id, LessonId=lesson_id)
            binding = _row(
                repo.connection,
                bindings,
                UserId=user_id,
                ConversationId=data.conversation_id,
            )
            if (
                row is None
                or binding is None
                or binding["LessonId"] != lesson_id
                or row["ConversationId"] != data.conversation_id
            ):
                raise HTTPException(404, "Lesson conversation not found.")
            if data.phase > int(row["Phase"]) + 1:
                raise HTTPException(409, "Complete the current teaching step first.")
            _update(
                repo.connection, progress, user_id, LessonId=lesson_id, Phase=data.phase
            )
            row["Phase"] = data.phase
            return _progress(row, practice_counts(repo, user_id, data.conversation_id))

    def check(self, user_id: int, lesson_id: str, data: CheckSubmission) -> Record:
        """Grade canonical choices; mastery also requires three real dialogue turns."""
        _, lesson = find_lesson(lesson_id)
        choices = {answer.question_id: answer.choice for answer in data.answers}
        if len(choices) != len(data.answers) or set(choices) != {
            question.id for question in lesson.checks
        }:
            raise HTTPException(422, "Answer every lesson question exactly once.")
        if any(choices[item.id] >= len(item.options) for item in lesson.checks):
            raise HTTPException(422, "Choice is outside the question options.")
        request_id = str(data.client_request_id)
        payload = {"lesson_id": lesson_id, "answers": choices}
        with self.transaction(user_id) as repo:
            previous, digest = self._receipt(
                repo, user_id, request_id, "check", payload
            )
            if previous:
                return previous
            row = _row(repo.connection, progress, UserId=user_id, LessonId=lesson_id)
            if row is None:
                raise HTTPException(409, "Start this lesson before submitting a check.")
            counts = practice_counts(repo, user_id, row["ConversationId"])
            correct = sum(choices[item.id] == item.answer for item in lesson.checks)
            passed = (
                correct == len(lesson.checks)
                and counts.get(row["ConversationId"], 0) >= MIN_PRACTICE_TURNS
            )
            values = {
                "Completed": bool(row["Completed"]) or passed,
                "CheckCorrect": correct,
                "CheckTotal": len(lesson.checks),
                "ReviewDue": now() + timedelta(days=3 if passed else 1),
                "Phase": 4 if passed else row["Phase"],
            }
            _update(repo.connection, progress, user_id, LessonId=lesson_id, **values)
            row.update(values)
            result = {
                "correct": correct,
                "total": len(lesson.checks),
                "passed": passed,
                "feedback": [
                    {
                        "question_id": item.id,
                        "correct": choices[item.id] == item.answer,
                        "explanation": item.explanation,
                        "answer": item.answer,
                    }
                    for item in lesson.checks
                ],
                "progress": _progress(row, counts),
            }
            self._save_receipt(repo, user_id, request_id, "check", digest, result)
            return result
