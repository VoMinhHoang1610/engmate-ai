"""Restore private learner profiles without schema changes or demo data."""

import os
from pathlib import Path
from tempfile import NamedTemporaryFile
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select

from app.db.database import Record
from app.schemas.chat import snake_name
from app.schemas.profile import ProfileUpdate
from app.services.base import PersistenceService
from app.services.common import now, public

MAX_AVATAR_BYTES = 2 * 1024 * 1024
PROFILE_FIELDS = (
    "Version",
    "DisplayName",
    "PhoneNumber",
    "BirthDate",
    "Gender",
    "CefrLevel",
    "LearningGoal",
    "DailyGoalMinutes",
    "TimeZoneId",
)


def avatar_type(content: bytes) -> str:
    """Serve only bounded raster formats, never active SVG or HTML content."""
    if len(content) > MAX_AVATAR_BYTES:
        raise HTTPException(413, "Avatar exceeds 2 MiB.")
    if len(content) >= 24 and content.startswith(b"\x89PNG\r\n\x1a\n"):
        width = int.from_bytes(content[16:20], "big")
        height = int.from_bytes(content[20:24], "big")
        if 0 < width <= 4096 and 0 < height <= 4096:
            return "image/png"
    if (
        len(content) >= 16
        and content.startswith(b"\xff\xd8\xff")
        and content.endswith(b"\xff\xd9")
    ):
        return "image/jpeg"
    if len(content) >= 16 and content.startswith(b"RIFF") and content[8:12] == b"WEBP":
        return "image/webp"
    raise HTTPException(422, "Upload a PNG, JPEG or WebP image.")


class ProfileService(PersistenceService):
    """Authorize every profile and avatar through the authenticated user."""

    def avatar_path(self, public_id: str) -> Path:
        """Only database-issued UUIDs can become file names."""
        root = self.db.settings.avatar_storage_dir
        return root / (UUID(str(public_id)).hex + ".img")

    def serialize(self, row: Record, public_id: str, minutes: int = 0) -> Record:
        """Exclude internal identifiers and return durable avatar availability."""
        result = public({key: row[key] for key in PROFILE_FIELDS})
        result["has_avatar"] = self.avatar_path(public_id).is_file()
        result["total_study_minutes"] = minutes
        return result

    def get(self, user_id: int, public_id: str) -> Record:
        """Read the learner's saved details and measured study duration."""
        with self.transaction() as repo:
            row = repo.one("LearnerProfiles", UserId=user_id)
            sessions = self.db.models.table("StudySessions", repo.connection)
            seconds = repo.connection.scalar(
                select(func.coalesce(func.sum(sessions.c.DurationSeconds), 0)).where(
                    sessions.c.UserId == user_id
                )
            )
            return self.serialize(row, public_id, int(seconds or 0) // 60)

    def update(self, user_id: int, public_id: str, data: ProfileUpdate) -> Record:
        """Update editable columns with ownership and lost-update protection."""
        if not self.db.mysql and data.cefr_level not in ("A2", "B1", "B2"):
            raise HTTPException(422, "Level is unsupported by the SQL Server schema.")
        with self.transaction(user_id) as repo:
            values = {
                column: getattr(data, snake_name(column))
                for column in PROFILE_FIELDS
                if column != "Version"
            }
            values["UpdatedAt"] = now()
            row = repo.update(
                "LearnerProfiles",
                {"UserId": user_id, "Version": self.db.version_value(data.version)},
                values,
            )
            result = self.serialize(row, public_id)
        # Return the same aggregate fields as GET without changing study records.
        result["total_study_minutes"] = self.get(user_id, public_id)[
            "total_study_minutes"
        ]
        return result

    def save_avatar(self, user_id: int, public_id: str, content: bytes) -> None:
        """Replace one owned image atomically, with no client-supplied paths."""
        avatar_type(content)
        target = self.avatar_path(public_id)
        target.parent.mkdir(parents=True, exist_ok=True)
        with self.transaction(user_id):
            with NamedTemporaryFile(
                dir=target.parent, delete=False, suffix=".tmp"
            ) as tmp:
                temporary = Path(tmp.name)
                tmp.write(content)
            try:
                os.replace(temporary, target)
            finally:
                temporary.unlink(missing_ok=True)

    def avatar(self, public_id: str) -> tuple[bytes, str]:
        """Return only the signed-in user's avatar bytes and verified MIME type."""
        target = self.avatar_path(public_id)
        try:
            with target.open("rb") as image:
                content = image.read(MAX_AVATAR_BYTES + 1)
        except FileNotFoundError:
            raise HTTPException(404, "Avatar not found.") from None
        return content, avatar_type(content)
