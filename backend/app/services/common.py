"""Shared clocks, ownership checks and serialization for learning services."""

from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException

from app.db.database import Record
from app.db.repository import Repository
from app.schemas.learning import snake_name


def now() -> datetime:
    """Use naive UTC for the schema's datetime2 columns."""
    return datetime.now(UTC).replace(tzinfo=None)


def public(row: Record, exclude: tuple[str, ...] = ()) -> Record:
    """Serialize SQL types while filtering explicitly excluded private fields."""
    result: Record = {}
    for key, value in row.items():
        if key in exclude:
            continue
        if isinstance(value, bytes):
            value = value.hex()
        elif isinstance(value, UUID):
            value = str(value)
        elif isinstance(value, datetime):
            value = value.replace(tzinfo=UTC).isoformat()
        elif isinstance(value, date):
            value = value.isoformat()
        elif isinstance(value, Decimal):
            value = float(value)
        result[snake_name(key)] = value
    return result


def owned(repo: Repository, name: str, key: str, identity: int, user_id: int) -> Record:
    """Use the authenticated owner as part of every private resource lookup."""
    return repo.one(name, **{key: identity, "UserId": user_id})


def local_day(profile: Record, timestamp: datetime) -> tuple[date, int]:
    """Derive the reporting date and UTC offset at the server event time."""
    local = timestamp.replace(tzinfo=UTC).astimezone(ZoneInfo(profile["TimeZoneId"]))
    offset = local.utcoffset()
    assert offset is not None
    return local.date(), int(offset.total_seconds() // 60)


def start_session(
    repo: Repository, user_id: int, request_id: UUID, activity: str
) -> Record:
    """Create the single source of credited learning time."""
    profile = repo.one("LearnerProfiles", UserId=user_id)
    day, offset = local_day(profile, now())
    return repo.insert(
        "StudySessions",
        UserId=user_id,
        ClientRequestId=request_id,
        ActivityType=activity,
        LocalStudyDate=day,
        UtcOffsetMinutes=offset,
        DailyGoalMinutes=profile["DailyGoalMinutes"],
    )


def finish_session(
    repo: Repository, session: Record, abandoned: bool = False
) -> Record:
    """Credit server elapsed time exactly once, on the completion day."""
    if session["Status"] != "in_progress":
        return session
    timestamp = now()
    profile = repo.one("LearnerProfiles", UserId=session["UserId"])
    day, offset = local_day(profile, timestamp)
    seconds = (
        0
        if abandoned
        else max(0, int((timestamp - session["StartedAt"]).total_seconds()))
    )
    return repo.update(
        "StudySessions",
        {"StudySessionId": session["StudySessionId"]},
        {
            "Status": "abandoned" if abandoned else "completed",
            "EndedAt": timestamp,
            "DurationSeconds": seconds,
            "DurationSource": "measured",
            "LocalStudyDate": day,
            "UtcOffsetMinutes": offset,
        },
    )


def require_open(repo: Repository, session_id: int, user_id: int) -> Record:
    """Completed sessions are immutable to additional learning submissions."""
    session = owned(repo, "StudySessions", "StudySessionId", session_id, user_id)
    if session["Status"] != "in_progress":
        raise HTTPException(409, "Study session is already closed.")
    return session
