"""Curriculum integrity and private-key boundaries without external services."""

import json
from pathlib import Path

import pytest

from app.services import curriculum
from app.services.curriculum import all_lessons, course, find_lesson, public_catalog


def test_course_is_detailed_and_answer_keys_are_private() -> None:
    """Every lesson has teachable material, three practice prompts and valid checks."""
    catalog = course()
    lessons = all_lessons()
    assert len(catalog.stages) == 5
    assert sum(len(stage.modules) for stage in catalog.stages) == 25
    assert len(lessons) >= 75
    assert len({lesson.id for _, lesson in lessons}) == len(lessons)
    for _, lesson in lessons:
        assert lesson.objective and lesson.explanation and lesson.opening
        assert len(lesson.practice) >= 3
        assert lesson.vocabulary and lesson.reading.text and lesson.listening.text
        assert len(lesson.checks) >= 2
        for item in lesson.checks:
            assert item.options[item.answer]
    public = public_catalog().model_dump()
    first = public["stages"][0]["modules"][0]["lessons"][0]
    assert all(
        "answer" not in item and "explanation" not in item for item in first["checks"]
    )
    assert find_lesson(lessons[-1][1].id)[1] == lessons[-1][1]


def test_invalid_catalog_rejects_duplicate_and_bad_answer(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    """Reject duplicate lesson IDs and answer indexes outside the options."""
    source = course().model_dump()
    path = tmp_path / "course.json"
    monkeypatch.setattr(curriculum, "CATALOG_PATH", path)
    for invalid in ("answer", "duplicate"):
        data = json.loads(json.dumps(source))
        lesson = data["stages"][0]["modules"][0]["lessons"][0]
        if invalid == "answer":
            lesson["checks"][0]["answer"] = 99
        else:
            data["stages"][0]["modules"][0]["lessons"].append(lesson)
        path.write_text(json.dumps(data), encoding="utf-8")
        curriculum.course.cache_clear()
        with pytest.raises(ValueError):
            curriculum.course()
    curriculum.course.cache_clear()
