"""Media validation rejects misleading file contents and handles absent decoders."""

import io
import wave
from pathlib import Path
from unittest.mock import Mock

import pytest
from fastapi import HTTPException

from app.services.media import MediaService


def test_image_size_and_format() -> None:
    """Uploads are bounded and SVG/invalid bytes cannot become active avatars."""
    for content, status in ((b"x" * (2 * 1024 * 1024 + 1), 413), (b"<svg/>", 422)):
        with pytest.raises(HTTPException) as error:
            MediaService.avatar(content)
        assert error.value.status_code == status


def test_audio_duration_validation(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Reject truncated WAV headers and unavailable/invalid WebM decoder results."""
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(8000)
        output.writeframes(b"\x00\x00" * 8000)
    path = tmp_path / "sample.wav"
    path.write_bytes(buffer.getvalue()[:-10])
    with pytest.raises(HTTPException) as error:
        MediaService.audio_duration(path, "audio/wav")
    assert error.value.status_code == 422
    monkeypatch.setattr("app.services.media.shutil.which", lambda _: None)
    with pytest.raises(HTTPException) as error:
        MediaService.audio_duration(path, "audio/webm")
    assert error.value.status_code == 503
    monkeypatch.setattr("app.services.media.shutil.which", lambda _: "test-ffprobe")
    runner = Mock(
        return_value=Mock(
            stdout=b'{"format":{"duration":"1.5"},"streams":[{"codec_type":"audio"}]}'
        )
    )
    monkeypatch.setattr("app.services.media.subprocess.run", runner)
    assert MediaService.audio_duration(path, "audio/webm") == 1500
    runner.return_value.stdout = (
        b'{"format":{"duration":"61"},"streams":[{"codec_type":"audio"}]}'
    )
    with pytest.raises(HTTPException):
        MediaService.audio_duration(path, "audio/webm")
