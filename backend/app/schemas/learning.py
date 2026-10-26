"""Bounded public contracts for the voice-led TOEIC course."""

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.ai import Level
from app.schemas.chat import MAX_ID, Input
from app.schemas.responses import ConversationResponse

LessonId = str


class VocabularyItem(BaseModel):
    """A contextual word taught in one small lesson."""

    term: str
    meaning: str
    example: str


class TextExercise(BaseModel):
    """A short reading or teacher-spoken listening stimulus."""

    text: str
    question: str


class PublicCheck(BaseModel):
    """A learner-facing question without the answer key."""

    id: str
    prompt: str
    options: list[str]
    skill: str
    mode: str
    stimulus: str | None = None


class Check(PublicCheck):
    """Server-only deterministic answer key and explanation."""

    answer: int
    explanation: str


class Lesson(BaseModel):
    """Server-authored teaching material for one voice-led micro lesson."""

    id: str
    title: str
    minutes: int
    objective: str
    explanation: str
    pattern: str
    example: str
    translation: str
    situation: str
    opening: str
    practice: list[str]
    vocabulary: list[VocabularyItem]
    reading: TextExercise
    listening: TextExercise
    checks: list[Check]


class PublicLesson(Lesson):
    """Lesson material with answer keys removed from each check."""

    checks: list[PublicCheck]  # type: ignore[assignment]


class Module(BaseModel):
    """A small group of lessons sharing TOEIC skills."""

    id: str
    title: str
    parts: list[int]
    lessons: list[Lesson]


class PublicModule(Module):
    """A module containing only public lesson contracts."""

    lessons: list[PublicLesson]  # type: ignore[assignment]


class Stage(BaseModel):
    """A proposed course stage, not an official TOEIC proficiency level."""

    id: str
    title: str
    target: str
    description: str
    level: Level
    modules: list[Module]


class PublicStage(Stage):
    """A stage containing only public modules."""

    modules: list[PublicModule]  # type: ignore[assignment]


class Catalog(BaseModel):
    """Versioned server course source."""

    version: str
    stages: list[Stage]


class CatalogResponse(BaseModel):
    """Public course tree with no answer keys."""

    version: str
    stages: list[PublicStage]


class PlanUpdate(Input):
    """Save an account-owned plan with optimistic concurrency."""

    version: int = Field(ge=0, le=2147483647)
    goal_score: Literal[450, 650, 800, 900, 990] = 650
    start_stage: str = Field(min_length=1, max_length=64, pattern=r"^[a-z0-9-]+$")
    minutes: int = Field(ge=10, le=60)
    exam_date: date | None = None


class PlanResponse(BaseModel):
    """A planning target; no predicted or certified TOEIC score."""

    version: int
    goal_score: int
    start_stage: str
    minutes: int
    exam_date: date | None


class LessonStart(Input):
    """Start or resume one lesson without automatically calling an AI provider."""

    client_request_id: UUID


class PhaseUpdate(Input):
    """Advance at most one teaching phase in an owned lesson conversation."""

    phase: int = Field(ge=0, le=4)
    conversation_id: int = Field(gt=0, le=MAX_ID)


class CheckAnswer(Input):
    """One choice for a server-issued question identifier."""

    question_id: str = Field(min_length=1, max_length=100)
    choice: int = Field(ge=0, le=7)


class CheckSubmission(Input):
    """Retry-safe complete submission, bounded before any grading work."""

    client_request_id: UUID
    answers: list[CheckAnswer] = Field(min_length=1, max_length=10)


class LessonProgress(BaseModel):
    """Measured conversation practice and deterministic checks, kept separate."""

    lesson_id: str
    conversation_id: int | None
    phase: int
    practice_turns: int
    completed: bool
    check_correct: int
    check_total: int
    review_due: datetime | None


class ProgressResponse(BaseModel):
    """Saved lesson evidence and a recommendation that does not lock browsing."""

    lessons: list[LessonProgress]
    recommended_lesson_id: str | None
    review_lesson_ids: list[str]


class LessonStartResponse(BaseModel):
    """The normal durable chat and its associated learning progress."""

    conversation: ConversationResponse
    progress: LessonProgress


class CheckFeedback(BaseModel):
    """Answer explanations become available after a complete submission."""

    question_id: str
    correct: bool
    explanation: str
    answer: int


class CheckResponse(BaseModel):
    """A local lesson check, never a TOEIC score or pronunciation grade."""

    correct: int
    total: int
    passed: bool
    feedback: list[CheckFeedback]
    progress: LessonProgress
