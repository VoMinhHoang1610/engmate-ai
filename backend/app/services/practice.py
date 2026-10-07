"""Immutable lesson attempts and server-scored listening submissions."""

import asyncio
import json
import re
from dataclasses import dataclass
from pathlib import Path
from time import perf_counter
from typing import cast

from fastapi import HTTPException
from fastapi.concurrency import run_in_threadpool

from app.db.database import Record
from app.db.repository import Repository
from app.llm.base import LLMClient
from app.schemas.ai import Level
from app.schemas.learning import AttemptCreate, AttemptSubmit
from app.services.common import (
    finish_session,
    now,
    owned,
    public,
    require_open,
    start_session,
)
from app.services.learning import LearningService

PROMPT = Path(__file__).resolve().parents[1] / "prompts" / "practice.v1.txt"


@dataclass
class PendingFeedback:
    """Detached evaluation context after the submission has been committed."""

    evaluation_id: int
    level: Level


def normalize_dictation(value: str) -> str:
    """Ignore case and repeated whitespace, while retaining spelling/punctuation."""
    return re.sub(r"\s+", " ", value.strip()).casefold()


class PracticeService(LearningService):
    """Keep grading, submission and elapsed study time under server control."""

    def start(self, user_id: int, data: AttemptCreate) -> Record:
        """Bind an attempt to one published lesson revision before practice starts."""
        with self.transaction(user_id) as repo:
            lesson = repo.one("Lessons", LessonId=data.lesson_id, IsPublished=True)
            valid = {
                "speaking": {"shadowing"},
                "listening": {"multiple_choice", "dictation"},
                "writing": {"writing"},
            }
            if data.mode not in valid[lesson["Skill"]]:
                raise HTTPException(422, "Mode does not match lesson skill.")
            if data.playback_rate is not None and lesson["Skill"] != "listening":
                raise HTTPException(
                    422, "Playback rate is only supported for listening."
                )
            previous = repo.rows(
                "StudySessions", UserId=user_id, ClientRequestId=data.client_request_id
            )
            if previous:
                if previous[0]["ActivityType"] != lesson["Skill"]:
                    raise HTTPException(409, "Request ID belongs to another activity.")
                attempt = repo.one(
                    "PracticeAttempts", StudySessionId=previous[0]["StudySessionId"]
                )
                rate = (
                    float(attempt["PlaybackRate"])
                    if attempt["PlaybackRate"] is not None
                    else None
                )
                if (attempt["LessonId"], attempt["Mode"], rate) != (
                    data.lesson_id,
                    data.mode,
                    data.playback_rate,
                ):
                    raise HTTPException(
                        409, "Request ID was used with different input."
                    )
            else:
                session = start_session(
                    repo, user_id, data.client_request_id, lesson["Skill"]
                )
                attempt = repo.insert(
                    "PracticeAttempts",
                    UserId=user_id,
                    StudySessionId=session["StudySessionId"],
                    LessonId=data.lesson_id,
                    Skill=lesson["Skill"],
                    Mode=data.mode,
                    PlaybackRate=data.playback_rate,
                )
            return public(attempt)

    def list_attempts(self, user_id: int, offset: int, limit: int) -> list[Record]:
        """Return only this learner's paginated practice history."""
        with self.transaction() as repo:
            return [
                public(row)
                for row in repo.page(
                    "PracticeAttempts", "AttemptId", offset, limit, UserId=user_id
                )
            ]

    def detail(self, user_id: int, identity: int) -> Record:
        """Return an owned attempt, saved answers and explicitly labelled evaluation."""
        with self.transaction() as repo:
            return self.result(
                repo, owned(repo, "PracticeAttempts", "AttemptId", identity, user_id)
            )

    @staticmethod
    def result(repo: Repository, attempt: Record) -> Record:
        """Serialize the attempt with authoritative answer scores and evaluation."""
        result = public(attempt)
        result["answers"] = [
            public(row)
            for row in repo.rows("AttemptAnswers", AttemptId=attempt["AttemptId"])
        ]
        result["evaluations"] = [
            public(row)
            for row in repo.rows(
                "AIEvaluations",
                AttemptId=attempt["AttemptId"],
                UserId=attempt["UserId"],
            )
        ]
        result["answer_key"] = []
        if attempt["Skill"] == "listening" and attempt["SubmittedAt"] is not None:
            for question in repo.rows(
                "LessonQuestions",
                LessonId=attempt["LessonId"],
                QuestionType=attempt["Mode"],
            ):
                correct_options = repo.rows(
                    "QuestionOptions", QuestionId=question["QuestionId"], IsCorrect=True
                )
                result["answer_key"].append(
                    {
                        "question_id": question["QuestionId"],
                        "expected_text": question["ExpectedText"],
                        "explanation": question["Explanation"],
                        "correct_option_id": (
                            correct_options[0]["OptionId"] if correct_options else None
                        ),
                    }
                )
        return result

    @staticmethod
    def grade(repo: Repository, attempt: Record, data: AttemptSubmit) -> float:
        """Grade a complete answer set using the stored lesson revision."""
        questions = repo.rows(
            "LessonQuestions",
            LessonId=attempt["LessonId"],
            QuestionType=attempt["Mode"],
        )
        received = {answer.question_id: answer for answer in data.answers}
        if (
            not questions
            or len(received) != len(data.answers)
            or set(received) != {row["QuestionId"] for row in questions}
        ):
            raise HTTPException(422, "Submit each question in this mode exactly once.")
        total = earned = 0.0
        for question in questions:
            answer = received[question["QuestionId"]]
            if attempt["Mode"] == "multiple_choice":
                if answer.selected_option_id is None or answer.answer_text is not None:
                    raise HTTPException(422, "Multiple choice requires an option only.")
                options = repo.rows(
                    "QuestionOptions", QuestionId=question["QuestionId"]
                )
                if (
                    len(options) < 2
                    or sum(bool(option["IsCorrect"]) for option in options) != 1
                ):
                    raise HTTPException(503, "Lesson answer key is incomplete.")
                chosen = next(
                    (
                        option
                        for option in options
                        if option["OptionId"] == answer.selected_option_id
                    ),
                    None,
                )
                if chosen is None:
                    raise HTTPException(422, "Option does not belong to this question.")
                correct = bool(chosen["IsCorrect"])
            else:
                if answer.answer_text is None or answer.selected_option_id is not None:
                    raise HTTPException(422, "Dictation requires answer text only.")
                correct = normalize_dictation(
                    answer.answer_text
                ) == normalize_dictation(question["ExpectedText"])
            points = question["Points"] if correct else 0
            total += float(question["Points"])
            earned += float(points)
            repo.insert(
                "AttemptAnswers",
                AttemptId=attempt["AttemptId"],
                QuestionId=question["QuestionId"],
                LessonId=attempt["LessonId"],
                QuestionType=attempt["Mode"],
                SelectedOptionId=answer.selected_option_id,
                AnswerText=answer.answer_text,
                IsCorrect=correct,
                AwardedPoints=points,
            )
        return round(100 * earned / total, 2)

    @staticmethod
    def validate_submission(
        repo: Repository, attempt: Record, data: AttemptSubmit
    ) -> None:
        """Enforce the UI's skill-specific inputs and media ownership."""
        skill = attempt["Skill"]
        if skill == "listening":
            if data.submitted_text is not None or data.recording_asset_id is not None:
                raise HTTPException(422, "Listening accepts answers only.")
        elif skill == "writing":
            if (
                data.submitted_text is None
                or data.recording_asset_id is not None
                or data.answers
            ):
                raise HTTPException(422, "Writing requires text only.")
        elif data.answers or (
            data.submitted_text is None and data.recording_asset_id is None
        ):
            raise HTTPException(422, "Speaking requires a transcript or recording.")
        if data.recording_asset_id is not None:
            asset = owned(
                repo,
                "MediaAssets",
                "MediaAssetId",
                data.recording_asset_id,
                attempt["UserId"],
            )
            if asset["Purpose"] != "recording":
                raise HTTPException(422, "Asset is not a recording.")

    @staticmethod
    def same_submission(repo: Repository, attempt: Record, data: AttemptSubmit) -> bool:
        """Accept a network retry only when its content equals the saved submission."""
        if (attempt["SubmittedText"], attempt["RecordingAssetId"]) != (
            data.submitted_text,
            data.recording_asset_id,
        ):
            return False
        rows = repo.rows("AttemptAnswers", AttemptId=attempt["AttemptId"])
        saved = {
            (row["QuestionId"], row["SelectedOptionId"], row["AnswerText"])
            for row in rows
        }
        incoming = {
            (row.question_id, row.selected_option_id, row.answer_text)
            for row in data.answers
        }
        return len(data.answers) == len(incoming) and saved == incoming

    def prepare(
        self, user_id: int, identity: int, data: AttemptSubmit
    ) -> PendingFeedback | Record:
        """Commit answers and reserve feedback in a worker thread."""
        with self.transaction(user_id) as repo:
            attempt = owned(repo, "PracticeAttempts", "AttemptId", identity, user_id)
            if attempt["SubmittedAt"] is not None:
                if not self.same_submission(repo, attempt, data):
                    raise HTTPException(
                        409, "Attempt was already submitted with different input."
                    )
                return self.result(repo, attempt)
            session = require_open(repo, attempt["StudySessionId"], user_id)
            self.validate_submission(repo, attempt, data)
            score = (
                self.grade(repo, attempt, data)
                if attempt["Skill"] == "listening"
                else None
            )
            attempt = repo.update(
                "PracticeAttempts",
                {
                    "AttemptId": identity,
                    "UserId": user_id,
                    "Version": bytes.fromhex(data.version),
                },
                {
                    "SubmittedAt": now(),
                    "SubmittedText": data.submitted_text,
                    "RecordingAssetId": data.recording_asset_id,
                    "ScorePercent": score,
                },
            )
            finish_session(repo, session)
            if attempt["Skill"] == "listening":
                return self.result(repo, attempt)
            evaluation = repo.insert(
                "AIEvaluations",
                UserId=user_id,
                AttemptId=identity,
                ClientRequestId=session["ClientRequestId"],
                Provider="mock",
                IsMock=True,
                PromptVersion="practice.v1",
            )
            profile = repo.one("LearnerProfiles", UserId=user_id)
            level = cast(Level, profile["CefrLevel"])
            return PendingFeedback(evaluation["EvaluationId"], level)

    def finalize(
        self,
        user_id: int,
        identity: int,
        pending: PendingFeedback,
        status: str,
        feedback: str | None,
        latency: int,
    ) -> Record:
        """Respect cancellation and keep mock feedback ungraded."""
        with self.transaction(user_id) as repo:
            evaluation = owned(
                repo, "AIEvaluations", "EvaluationId", pending.evaluation_id, user_id
            )
            if evaluation["Status"] == "pending":
                repo.update(
                    "AIEvaluations",
                    {"EvaluationId": pending.evaluation_id},
                    {
                        "Status": status,
                        "CompletedAt": now(),
                        "Feedback": feedback,
                        "LatencyMs": latency,
                        "ResultJson": (
                            json.dumps({"is_mock": True, "assessment_available": False})
                            if feedback is not None
                            else None
                        ),
                    },
                )
            return self.result(
                repo, owned(repo, "PracticeAttempts", "AttemptId", identity, user_id)
            )

    async def submit(
        self, user_id: int, identity: int, data: AttemptSubmit, client: LLMClient
    ) -> Record:
        """Commit before AI, run SQL off the event loop, and bound provider latency."""
        pending = await run_in_threadpool(self.prepare, user_id, identity, data)
        if isinstance(pending, dict):
            return pending
        started = perf_counter()
        try:
            feedback = await asyncio.wait_for(
                client.generate(
                    data.submitted_text
                    or "Recording saved. Audio analysis is unavailable in mock mode.",
                    pending.level,
                    PROMPT.read_text(encoding="utf-8"),
                ),
                timeout=30,
            )
            if not feedback.strip():
                raise ValueError("Empty provider feedback")
        except Exception:
            await run_in_threadpool(
                self.finalize,
                user_id,
                identity,
                pending,
                "failed",
                None,
                int((perf_counter() - started) * 1000),
            )
            raise HTTPException(
                502, "AI feedback is temporarily unavailable."
            ) from None
        return await run_in_threadpool(
            self.finalize,
            user_id,
            identity,
            pending,
            "completed",
            feedback,
            int((perf_counter() - started) * 1000),
        )

    def abandon(self, user_id: int, identity: int) -> Record:
        """Close unfinished practice without awarding study time."""
        with self.transaction(user_id) as repo:
            attempt = owned(repo, "PracticeAttempts", "AttemptId", identity, user_id)
            session = owned(
                repo,
                "StudySessions",
                "StudySessionId",
                attempt["StudySessionId"],
                user_id,
            )
            return public(finish_session(repo, session, abandoned=True))
