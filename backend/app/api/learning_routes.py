"""Authenticated course browsing, plans and measured micro-lesson progress."""

from typing import Annotated

from fastapi import APIRouter, Depends, Path, Request

from app.api.chat_routes import User
from app.db.database import Record
from app.schemas.learning import (
    CatalogResponse,
    CheckResponse,
    CheckSubmission,
    LessonProgress,
    LessonStart,
    LessonStartResponse,
    PhaseUpdate,
    PlanResponse,
    PlanUpdate,
    ProgressResponse,
)
from app.services.curriculum import public_catalog
from app.services.learning import LearningService

router = APIRouter(prefix="/api/learning", tags=["learning"])
LessonIdentity = Annotated[
    str, Path(min_length=1, max_length=100, pattern=r"^[a-z0-9-]+$")
]


def learning_service(request: Request) -> LearningService:
    """Resolve the application-scoped database without creating schemas."""
    return LearningService(request.app.state.database)


Learning = Annotated[LearningService, Depends(learning_service)]


@router.get("/catalog", response_model=CatalogResponse)
def catalog(user: User) -> CatalogResponse:
    """Browse the complete authored course without exposing check answer keys."""
    return public_catalog()


@router.get("/plan", response_model=PlanResponse)
def plan(user: User, service: Learning) -> Record:
    """Read the current account's saved goal and starting stage."""
    return service.plan(user["UserId"])


@router.put("/plan", response_model=PlanResponse)
def save_plan(data: PlanUpdate, user: User, service: Learning) -> Record:
    """Save planning preferences with explicit conflict detection."""
    return service.save_plan(user["UserId"], data)


@router.get("/progress", response_model=ProgressResponse)
def progress(user: User, service: Learning) -> Record:
    """Read actual lesson evidence and review dates from the database."""
    return service.progress(user["UserId"])


@router.post("/lessons/{lesson_id}/start", response_model=LessonStartResponse)
def start(
    lesson_id: LessonIdentity, data: LessonStart, user: User, service: Learning
) -> Record:
    """Start or resume a bound chat, with no automatic provider call."""
    return service.start(user["UserId"], lesson_id, data)


@router.put("/lessons/{lesson_id}/phase", response_model=LessonProgress)
def phase(
    lesson_id: LessonIdentity, data: PhaseUpdate, user: User, service: Learning
) -> Record:
    """Move through the lesson in sequence or revisit an earlier teaching step."""
    return service.phase(user["UserId"], lesson_id, data)


@router.post("/lessons/{lesson_id}/check", response_model=CheckResponse)
def check(
    lesson_id: LessonIdentity, data: CheckSubmission, user: User, service: Learning
) -> Record:
    """Grade a full canonical check and save an idempotent result receipt."""
    return service.check(user["UserId"], lesson_id, data)
