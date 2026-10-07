"""Profile, catalogue, vocabulary, flashcard and dashboard business rules."""

from collections.abc import Iterator
from contextlib import contextmanager
from datetime import timedelta

from fastapi import HTTPException
from sqlalchemy import select

from app.db.database import Database, Record
from app.db.repository import Repository
from app.schemas.learning import (
    FlashcardCreate,
    MasteryUpdate,
    ProfileUpdate,
    ReviewCreate,
    SettingsUpdate,
    VocabularyCreate,
    VocabularyUpdate,
    database_fields,
)
from app.services.common import (
    finish_session,
    local_day,
    now,
    owned,
    public,
    require_open,
    start_session,
)


class LearningService:
    """Persist the UI's learning data against the authoritative em schema."""

    def __init__(self, database: Database) -> None:
        """Use a shared database without an eager connection."""
        self.db = database

    @contextmanager
    def transaction(self, user_id: int | None = None) -> Iterator[Repository]:
        """Serialize mutations for one learner to prevent double credits."""
        with self.db.transaction() as connection:
            if user_id is not None:
                self.db.lock_user(connection, user_id)
            yield Repository(self.db, connection)

    def profile(self, user_id: int) -> Record:
        """Return a learner's profile and current concurrency token."""
        with self.transaction() as repo:
            return public(repo.one("LearnerProfiles", UserId=user_id))

    def update_profile(self, user_id: int, data: ProfileUpdate) -> Record:
        """Validate avatar ownership before applying an optimistic update."""
        with self.transaction(user_id) as repo:
            if data.avatar_asset_id is not None:
                asset = owned(
                    repo, "MediaAssets", "MediaAssetId", data.avatar_asset_id, user_id
                )
                if asset["Purpose"] != "avatar":
                    raise HTTPException(422, "Asset is not an avatar.")
            values = database_fields(data.model_dump(exclude={"version"}))
            values["UpdatedAt"] = now()
            return public(
                repo.update(
                    "LearnerProfiles",
                    {"UserId": user_id, "Version": bytes.fromhex(data.version)},
                    values,
                )
            )

    def settings(self, user_id: int) -> Record:
        """Return display and playback preferences."""
        with self.transaction() as repo:
            return public(repo.one("UserSettings", UserId=user_id))

    def update_settings(self, user_id: int, data: SettingsUpdate) -> Record:
        """Persist only the supported preferences with lost-update protection."""
        with self.transaction(user_id) as repo:
            values = database_fields(data.model_dump(exclude={"version"}))
            values["UpdatedAt"] = now()
            return public(
                repo.update(
                    "UserSettings",
                    {"UserId": user_id, "Version": bytes.fromhex(data.version)},
                    values,
                )
            )

    def topics(self) -> list[Record]:
        """Return the active roleplay catalogue in display order."""
        with self.transaction() as repo:
            return [
                public(row)
                for row in repo.page("Topics", "SortOrder", 0, 100, IsActive=True)
            ]

    def lessons(self, skill: str | None, offset: int, limit: int) -> list[Record]:
        """List published lesson revisions only."""
        with self.transaction() as repo:
            filters: Record = {"IsPublished": True}
            if skill is not None:
                filters["Skill"] = skill
            return [
                public(row)
                for row in repo.page("Lessons", "LessonId", offset, limit, **filters)
            ]

    def lesson(self, lesson_id: int) -> Record:
        """Return exercise prompts without leaking the listening answer key."""
        with self.transaction() as repo:
            lesson = public(repo.one("Lessons", LessonId=lesson_id, IsPublished=True))
            questions = repo.page(
                "LessonQuestions", "Position", 0, 100, LessonId=lesson_id
            )
            lesson["questions"] = [self.question(repo, row) for row in questions]
            return lesson

    @staticmethod
    def question(repo: Repository, row: Record) -> Record:
        """Hide expected text, explanations and correct-option flags until graded."""
        result = public(row, ("ExpectedText", "Explanation"))
        result["options"] = [
            public(option, ("IsCorrect",))
            for option in repo.page(
                "QuestionOptions", "Position", 0, 100, QuestionId=row["QuestionId"]
            )
        ]
        return result

    @staticmethod
    def provenance(repo: Repository, user_id: int, data: VocabularyCreate) -> None:
        """A saved word may reference at most one of the learner's own sources."""
        if data.source_message_id is not None and data.source_attempt_id is not None:
            raise HTTPException(422, "Choose only one vocabulary source.")
        if data.source_message_id is not None:
            owned(repo, "Messages", "MessageId", data.source_message_id, user_id)
        if data.source_attempt_id is not None:
            owned(
                repo, "PracticeAttempts", "AttemptId", data.source_attempt_id, user_id
            )

    def vocabulary(
        self,
        user_id: int,
        offset: int,
        limit: int,
        due: bool,
        search: str = "",
        mastered: bool | None = None,
    ) -> list[Record]:
        """List active entries, optionally restricted to cards due now."""
        with self.transaction() as repo:
            table = self.db.models.table("UserVocabulary", repo.connection)
            query = select(table).where(
                table.c.UserId == user_id, table.c.ArchivedAt.is_(None)
            )
            if due:
                query = query.where(
                    (table.c.NextReviewAt.is_(None)) | (table.c.NextReviewAt <= now())
                )
            if search:
                query = query.where(
                    table.c.Word.contains(search, autoescape=True)
                    | table.c.Meaning.contains(search, autoescape=True)
                )
            if mastered is not None:
                query = query.where(table.c.IsMastered == mastered)
            query = query.order_by(table.c.UserVocabularyId).offset(offset).limit(limit)
            return [
                public(dict(row)) for row in repo.connection.execute(query).mappings()
            ]

    def add_vocabulary(self, user_id: int, data: VocabularyCreate) -> Record:
        """Create a private entry; the unique filtered index prevents duplicates."""
        with self.transaction(user_id) as repo:
            self.provenance(repo, user_id, data)
            return public(
                repo.insert(
                    "UserVocabulary",
                    UserId=user_id,
                    **database_fields(data.model_dump()),
                )
            )

    def update_vocabulary(
        self, user_id: int, identity: int, data: VocabularyUpdate
    ) -> Record:
        """Edit content without accepting forged mastery or review statistics."""
        with self.transaction(user_id) as repo:
            owned(repo, "UserVocabulary", "UserVocabularyId", identity, user_id)
            self.provenance(repo, user_id, data)
            values = database_fields(data.model_dump(exclude={"version"}))
            values["UpdatedAt"] = now()
            return public(
                repo.update(
                    "UserVocabulary",
                    {
                        "UserVocabularyId": identity,
                        "UserId": user_id,
                        "ArchivedAt": None,
                        "Version": bytes.fromhex(data.version),
                    },
                    values,
                )
            )

    def archive_vocabulary(self, user_id: int, identity: int, version: str) -> None:
        """Soft-delete the word so past reviews remain part of the learning record."""
        with self.transaction(user_id) as repo:
            row = owned(repo, "UserVocabulary", "UserVocabularyId", identity, user_id)
            if row["ArchivedAt"] is not None:
                return
            repo.update(
                "UserVocabulary",
                {
                    "UserVocabularyId": identity,
                    "UserId": user_id,
                    "Version": bytes.fromhex(version),
                },
                {"ArchivedAt": now(), "UpdatedAt": now()},
            )

    def start_flashcards(self, user_id: int, data: FlashcardCreate) -> Record:
        """Start once per request ID and reject a mismatched retry."""
        with self.transaction(user_id) as repo:
            previous = repo.rows(
                "StudySessions", UserId=user_id, ClientRequestId=data.client_request_id
            )
            if previous:
                if previous[0]["ActivityType"] != "flashcard":
                    raise HTTPException(409, "Request ID belongs to another activity.")
                session = repo.one(
                    "FlashcardSessions", StudySessionId=previous[0]["StudySessionId"]
                )
                if session["ReviewAll"] != data.review_all:
                    raise HTTPException(
                        409, "Request ID was used with different input."
                    )
            else:
                study = start_session(
                    repo, user_id, data.client_request_id, "flashcard"
                )
                session = repo.insert(
                    "FlashcardSessions",
                    UserId=user_id,
                    StudySessionId=study["StudySessionId"],
                    ReviewAll=data.review_all,
                )
            return public(session)

    def update_mastery(
        self, user_id: int, identity: int, data: MasteryUpdate
    ) -> Record:
        """Match the notebook's manual toggle without manufacturing a review count."""
        with self.transaction(user_id) as repo:
            owned(repo, "UserVocabulary", "UserVocabularyId", identity, user_id)
            return public(
                repo.update(
                    "UserVocabulary",
                    {
                        "UserVocabularyId": identity,
                        "UserId": user_id,
                        "ArchivedAt": None,
                        "Version": bytes.fromhex(data.version),
                    },
                    {"IsMastered": data.is_mastered, "UpdatedAt": now()},
                )
            )

    def review(self, user_id: int, session_id: int, data: ReviewCreate) -> Record:
        """Insert the review and advance its vocabulary schedule atomically."""
        with self.transaction(user_id) as repo:
            session = owned(
                repo, "FlashcardSessions", "FlashcardSessionId", session_id, user_id
            )
            previous = repo.rows(
                "FlashcardReviews",
                UserId=user_id,
                ClientRequestId=data.client_request_id,
            )
            if previous:
                row = previous[0]
                if (
                    row["FlashcardSessionId"],
                    row["UserVocabularyId"],
                    row["Rating"],
                ) != (session_id, data.vocabulary_id, data.rating):
                    raise HTTPException(
                        409, "Request ID was used with different input."
                    )
                return public(row)
            require_open(repo, session["StudySessionId"], user_id)
            word = owned(
                repo, "UserVocabulary", "UserVocabularyId", data.vocabulary_id, user_id
            )
            if word["ArchivedAt"] is not None:
                raise HTTPException(404, "Vocabulary entry is archived.")
            timestamp = now()
            if (
                not session["ReviewAll"]
                and word["NextReviewAt"] is not None
                and word["NextReviewAt"] > timestamp
            ):
                raise HTTPException(409, "This card is not due yet.")
            interval = {"again": 0, "hard": 1, "good": 4, "easy": 7}[data.rating]
            next_review = timestamp + timedelta(days=interval)
            profile = repo.one("LearnerProfiles", UserId=user_id)
            day, offset = local_day(profile, timestamp)
            review = repo.insert(
                "FlashcardReviews",
                UserId=user_id,
                FlashcardSessionId=session_id,
                UserVocabularyId=data.vocabulary_id,
                ClientRequestId=data.client_request_id,
                Rating=data.rating,
                IntervalDays=interval,
                ReviewedAt=timestamp,
                LocalReviewDate=day,
                UtcOffsetMinutes=offset,
                NextReviewAt=next_review,
            )
            repo.update(
                "UserVocabulary",
                {"UserVocabularyId": data.vocabulary_id, "UserId": user_id},
                {
                    "NextReviewAt": next_review,
                    "LastReviewedAt": timestamp,
                    "ReviewCount": word["ReviewCount"] + 1,
                    "IsMastered": interval >= 4,
                    "UpdatedAt": timestamp,
                },
            )
            return public(review)

    def close_flashcards(self, user_id: int, identity: int, abandoned: bool) -> Record:
        """Finish or abandon a session once without duplicate time credits."""
        with self.transaction(user_id) as repo:
            session = owned(
                repo, "FlashcardSessions", "FlashcardSessionId", identity, user_id
            )
            study = owned(
                repo,
                "StudySessions",
                "StudySessionId",
                session["StudySessionId"],
                user_id,
            )
            return public(finish_session(repo, study, abandoned))

    def dashboard(self, user_id: int, days: int) -> Record:
        """Read independently aggregated views to avoid join-multiplied totals."""
        with self.transaction() as repo:
            totals = public(repo.one("vUserLearningStats", UserId=user_id))
            profile = repo.one("LearnerProfiles", UserId=user_id)
            today, _ = local_day(profile, now())
            table = self.db.models.table("vDailyLearningStats", repo.connection)
            rows = repo.connection.execute(
                select(table)
                .where(
                    table.c.UserId == user_id,
                    table.c.LocalStudyDate >= today - timedelta(days=days - 1),
                    table.c.LocalStudyDate <= today,
                )
                .order_by(table.c.LocalStudyDate)
            ).mappings()
            totals["daily"] = [public(dict(row)) for row in rows]
            totals["daily_goal_minutes"] = profile["DailyGoalMinutes"]
            return totals

    def evaluation(self, user_id: int, identity: int) -> Record:
        """Inspect an owned AI job and any validated error records."""
        with self.transaction() as repo:
            row = owned(repo, "AIEvaluations", "EvaluationId", identity, user_id)
            result = public(row)
            result["errors"] = [
                public(error)
                for error in repo.rows("ErrorRecords", EvaluationId=identity)
            ]
            return result

    def cancel_evaluation(self, user_id: int, identity: int) -> Record:
        """Recover a stuck pending job without allowing late AI writes to revive it."""
        with self.transaction(user_id) as repo:
            row = owned(repo, "AIEvaluations", "EvaluationId", identity, user_id)
            if row["Status"] == "pending":
                row = repo.update(
                    "AIEvaluations",
                    {"EvaluationId": identity},
                    {"Status": "cancelled", "CompletedAt": now()},
                )
                if row["MessageId"] is not None:
                    message = owned(
                        repo, "Messages", "MessageId", row["MessageId"], user_id
                    )
                    reply = repo.one(
                        "Messages",
                        ConversationId=message["ConversationId"],
                        UserId=user_id,
                        SequenceNumber=message["SequenceNumber"] + 1,
                    )
                    repo.update(
                        "Messages",
                        {"MessageId": reply["MessageId"]},
                        {"Status": "cancelled"},
                    )
            return public(row)
