"""Verify complete risk review and non-replaying interleaved planning offline."""

import math
from pathlib import Path

import pytest

from evals.scope.review_available import (
    MANDATORY,
    interleave_pending,
    protect_hand_grades,
    select_reviews,
)


def test_review_includes_every_risky_and_flagged_response() -> None:
    """Keep repetitions distinct and sample each version/group independently."""
    rows = [
        {"slot": i, "group": group, "version": version, "screen_status": status}
        for i, (group, version, status) in enumerate(
            [(g, "persona.v7", "screen_clear") for g in MANDATORY]
            + [
                ("in_scope", v, "flagged" if n == 0 else "screen_clear")
                for v in ("persona.v6", "persona.v7")
                for n in range(11)
            ]
            + [("gray", "persona.v7", "uncertain")],
            1,
        )
    ]
    selected, strata = select_reviews(rows)
    ids = {row["slot"] for row in selected}
    assert all(
        row["slot"] in ids
        for row in rows
        if row["group"] in MANDATORY or row["screen_status"] != "screen_clear"
    )
    assert len(ids) == len(selected)
    for stratum in strata:
        if stratum["group"] == "in_scope":
            assert stratum["random_additional"] == math.ceil(11 / 5)
            assert stratum["selected"] == 4
    assert select_reviews(list(reversed(rows))) == (selected, strata)


def test_interleaving_preserves_every_pending_slot_once() -> None:
    """Interleave unequal strata while preserving slot identity and local order."""
    rows = [
        {"slot": i, "version": "persona.v7", "group": group}
        for i, group in [
            (427, "in_scope"),
            (428, "in_scope"),
            (500, "safety"),
            (600, "identity"),
            (601, "identity"),
        ]
    ]
    ordered = interleave_pending(rows)
    assert [row["slot"] for row in ordered] == [600, 427, 500, 601, 428]
    assert sorted(ordered, key=lambda row: row["slot"]) == rows
    assert interleave_pending([]) == []


def test_regeneration_preserves_completed_human_review(tmp_path: Path) -> None:
    """Do not erase even an unfinished reviewer's reason or evidence."""
    protect_hand_grades(tmp_path)
    sheet = tmp_path / "manual_review.csv"
    sheet.write_text("human_grade,human_reason,human_evidence\n,,\n", encoding="utf-8")
    protect_hand_grades(tmp_path)
    for row in ("pass,,", ",needs review,", ",,example"):
        original = "human_grade,human_reason,human_evidence\n" + row + "\n"
        sheet.write_text(original, encoding="utf-8")
        with pytest.raises(ValueError, match="Human review exists"):
            protect_hand_grades(tmp_path)
        assert sheet.read_text(encoding="utf-8") == original
