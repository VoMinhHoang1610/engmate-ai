"""HTTP contracts for the mock AI demonstration."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Level = Literal["Pre-A1", "A1", "A2", "B1", "B2", "C1", "C2"]


class ReplyRequest(BaseModel):
    """Validate a learner message before passing it to a provider."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    message: str = Field(min_length=1, max_length=2000)
    level: Level = "A2"


class ReplyResponse(BaseModel):
    """Explicitly identify mock output so it is not mistaken for a real model."""

    reply: str
    provider: Literal["mock"] = "mock"
    level: Level
