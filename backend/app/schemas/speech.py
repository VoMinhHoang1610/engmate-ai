"""Validated speech requests independent of the mock chat provider."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

SpeechLanguage = Literal["en", "vi"]


class SpeechVoice(BaseModel):
    """Expose selectable voices without provider URLs or account metadata."""

    id: str
    name: str
    language: SpeechLanguage
    gender: Literal["male", "female"] | None = None


class TTSRequest(BaseModel):
    """Bound text and expose only supported speech controls."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    text: str = Field(min_length=1, max_length=2000)
    language: SpeechLanguage = "en"
    speaker_id: str | None = Field(default=None, min_length=1, max_length=120)
    speed: float = Field(default=1, ge=0.5, le=2)


class STTResponse(BaseModel):
    """Return the transcription without exposing provider metadata."""

    text: str
    language: SpeechLanguage
    provider: Literal["blaze"] = "blaze"
