"""Load and validate the versioned, server-authored TOEIC lesson source."""

import re
from functools import lru_cache
from pathlib import Path

from fastapi import HTTPException

from app.schemas.learning import Catalog, CatalogResponse, Lesson, Stage

CATALOG_PATH = Path(__file__).resolve().parents[1] / "content" / "toeic.v1.json"


@lru_cache(maxsize=1)
def course() -> Catalog:
    """Reject invalid identities or answer indexes before exposing a course."""
    catalog = Catalog.model_validate_json(CATALOG_PATH.read_text(encoding="utf-8"))
    identities: set[str] = set()
    stage_ids: set[str] = set()
    module_ids: set[str] = set()
    for stage in catalog.stages:
        if stage.id in stage_ids or not stage.modules:
            raise ValueError("Duplicate or empty stage in catalog.")
        stage_ids.add(stage.id)
        for module in stage.modules:
            if module.id in module_ids or not module.lessons:
                raise ValueError("Duplicate or empty module in catalog.")
            module_ids.add(module.id)
            for lesson in module.lessons:
                if (
                    lesson.id in identities
                    or not lesson.checks
                    or not re.fullmatch(r"[a-z0-9-]{1,100}", lesson.id)
                ):
                    raise ValueError("Duplicate or unassessable lesson in catalog.")
                identities.add(lesson.id)
                questions = {check.id for check in lesson.checks}
                if len(questions) != len(lesson.checks):
                    raise ValueError("Duplicate question identity in lesson.")
                if any(
                    not 0 <= check.answer < len(check.options)
                    for check in lesson.checks
                ):
                    raise ValueError("Invalid answer index in catalog.")
    if not identities:
        raise ValueError("Course must contain lessons.")
    return catalog


def public_catalog() -> CatalogResponse:
    """Whitelist public fields so deterministic answer keys never reach GET."""
    return CatalogResponse.model_validate(course().model_dump())


@lru_cache(maxsize=1)
def public_catalog_json() -> str:
    """Serialize the public whitelist once, without answer keys."""
    return public_catalog().model_dump_json()


def all_lessons() -> list[tuple[Stage, Lesson]]:
    """Return the canonical ordering used for plan recommendations."""
    return [
        (stage, lesson)
        for stage in course().stages
        for module in stage.modules
        for lesson in module.lessons
    ]


def find_lesson(lesson_id: str) -> tuple[Stage, Lesson]:
    """Resolve only canonical lesson IDs; user text cannot supply lesson prompts."""
    for stage, lesson in all_lessons():
        if lesson.id == lesson_id:
            return stage, lesson
    raise HTTPException(404, "Lesson not found.")
