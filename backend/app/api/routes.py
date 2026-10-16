"""Liveness and honest provider capabilities, independent of paid requests."""

from fastapi import APIRouter, Request

from app.db.database import Record

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    """Check process liveness without a database or provider call."""
    return {"status": "ok", "service": "engmate-ai"}


@router.get("/capabilities")
def capabilities(request: Request) -> Record:
    """Expose configuration status without secret values or paid probes."""
    settings = request.app.state.settings
    mock = settings.llm_provider == "mock"
    return {
        "provider": settings.llm_provider,
        "is_mock": mock,
        "chat": settings.chat_configured,
        "streaming": settings.chat_configured,
        "speech": bool(settings.blaze_api_key),
        "realtime": settings.chat_configured,
        "reason": (
            None
            if settings.chat_configured
            else "Cần cấu hình khóa API của provider đã chọn để chat và thoại."
        ),
    }
