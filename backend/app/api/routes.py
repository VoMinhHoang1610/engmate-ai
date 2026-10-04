"""Small, testable HTTP surface for the scaffold."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_ai_service
from app.schemas.ai import ReplyRequest, ReplyResponse
from app.services.ai_service import AIService

router = APIRouter(prefix="/api")


@router.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    """Check process liveness without making a DB or model call."""
    return {"status": "ok", "service": "engmate-ai"}


@router.post("/ai/reply", response_model=ReplyResponse, tags=["ai-demo"])
async def reply(
    request: ReplyRequest,
    service: Annotated[AIService, Depends(get_ai_service)],
) -> ReplyResponse:
    """Expose the mock adapter and translate provider timeouts to HTTP errors."""
    try:
        return await service.reply(request)
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail="AI provider timed out.") from exc
