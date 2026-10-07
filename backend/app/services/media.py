"""Private filesystem assets with decoded image and measured audio validation."""

import io
import json
import shutil
import subprocess
import wave
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException
from PIL import Image, UnidentifiedImageError

from app.core.config import Settings
from app.db.database import Database, Record
from app.services.common import owned, public
from app.services.learning import LearningService


class MediaService(LearningService):
    """Store only supported assets, never client filenames or arbitrary paths."""

    def __init__(self, database: Database, settings: Settings) -> None:
        """Resolve durable storage once; file access always requires ownership."""
        super().__init__(database)
        self.root = settings.media_directory.resolve()

    @staticmethod
    def avatar(content: bytes) -> tuple[bytes, str, str]:
        """Decode/re-encode PNG/JPEG to remove metadata and reject other formats."""
        if len(content) > 2 * 1024 * 1024:
            raise HTTPException(413, "Avatar exceeds 2 MiB.")
        try:
            with Image.open(io.BytesIO(content)) as image:
                if image.format not in {"PNG", "JPEG"} or max(image.size) > 4096:
                    raise ValueError("Unsupported image")
                image.load()
                image.thumbnail((512, 512))
                output = io.BytesIO()
                image.convert("RGB").save(output, format="JPEG", quality=90)
                return output.getvalue(), "image/jpeg", ".jpg"
        except (
            UnidentifiedImageError,
            OSError,
            ValueError,
            Image.DecompressionBombError,
        ) as exc:
            raise HTTPException(
                422, "Upload a valid PNG or JPEG avatar up to 4096 pixels."
            ) from exc

    @staticmethod
    def audio_duration(path: Path, content_type: str) -> int:
        """Measure duration with a decoder instead of accepting client metadata."""
        try:
            if content_type == "audio/wav":
                with wave.open(str(path), "rb") as recording:
                    seconds = recording.getnframes() / recording.getframerate()
            else:
                probe = shutil.which("ffprobe")
                if probe is None:
                    raise HTTPException(
                        503,
                        "Install ffmpeg/ffprobe for WebM or Ogg; WAV is supported now.",
                    )
                result = subprocess.run(
                    [
                        probe,
                        "-v",
                        "error",
                        "-show_entries",
                        "format=duration:stream=codec_type,duration",
                        "-of",
                        "json",
                        str(path),
                    ],
                    check=True,
                    capture_output=True,
                    timeout=10,
                )
                metadata = json.loads(result.stdout)
                streams = metadata.get("streams", [])
                if not streams or any(
                    stream["codec_type"] != "audio" for stream in streams
                ):
                    raise ValueError("Not audio-only")
                seconds = float(
                    metadata["format"].get("duration") or streams[0]["duration"]
                )
            if not 0 < seconds <= 60:
                raise ValueError("Invalid duration")
            return max(1, round(seconds * 1000))
        except (
            wave.Error,
            OSError,
            ValueError,
            KeyError,
            ZeroDivisionError,
            subprocess.SubprocessError,
        ) as exc:
            raise HTTPException(
                422, "Upload valid audio lasting at most 60 seconds."
            ) from exc

    def upload(
        self, user_id: int, purpose: str, content_type: str, content: bytes
    ) -> Record:
        """Write the asset and its owned metadata, removing orphan files on rollback."""
        if not content:
            raise HTTPException(422, "File is empty.")
        if len(content) > 8 * 1024 * 1024:
            raise HTTPException(413, "Recording exceeds 8 MiB.")
        duration = None
        if purpose == "avatar":
            content, content_type, suffix = self.avatar(content)
        else:
            formats = {"audio/wav": ".wav", "audio/webm": ".webm", "audio/ogg": ".ogg"}
            if content_type not in formats:
                raise HTTPException(422, "Supported recording formats: WAV, WebM, Ogg.")
            suffix = formats[content_type]
        self.root.mkdir(parents=True, exist_ok=True)
        key = uuid4().hex + suffix
        path = self.root / key
        try:
            path.write_bytes(content)
            if purpose == "recording":
                duration = self.audio_duration(path, content_type)
            with self.transaction(user_id) as repo:
                row = repo.insert(
                    "MediaAssets",
                    UserId=user_id,
                    Purpose=purpose,
                    StorageKey=key,
                    ContentType=content_type,
                    SizeBytes=len(content),
                    DurationMs=duration,
                )
                return public(row, ("StorageKey",))
        except Exception:
            path.unlink(missing_ok=True)
            raise

    def download(self, user_id: int, identity: int) -> tuple[Path, str]:
        """Verify both database ownership and filesystem containment before serving."""
        with self.transaction() as repo:
            row = owned(repo, "MediaAssets", "MediaAssetId", identity, user_id)
            path = (self.root / row["StorageKey"]).resolve()
            if not path.is_relative_to(self.root) or not path.is_file():
                raise HTTPException(404, "Asset content is unavailable.")
            return path, row["ContentType"]
