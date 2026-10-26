"""Build bounded voice persona instructions from the selected speaker metadata."""

from pathlib import Path
from typing import Literal

from app.core.prompts import read_prompt

PROMPT_PATH = Path(__file__).resolve().parents[1] / "prompts" / "voice-identity.v1.txt"


def voice_instructions(gender: Literal["male", "female"] | None) -> str:
    """Use neutral wording if the catalog does not identify the voice's gender."""
    pronoun = {"male": "thầy", "female": "cô"}.get(gender or "", "mình")
    return read_prompt(PROMPT_PATH).format(
        gender=gender or "not labeled by gender",
        name="Mate" if gender is None else f"{pronoun} Mate",
        pronoun=pronoun,
    )
