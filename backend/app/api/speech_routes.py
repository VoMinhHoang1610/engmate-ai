"""Speech endpoints with authenticated access and opt-in loopback demo."""

from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
)

from app.api.learning_routes import Auth, Identity, Learning, User
from app.schemas.speech import SpeechLanguage, SpeechVoice, STTResponse, TTSRequest
from app.services.speech import MAX_AUDIO, SpeechService

router = APIRouter(prefix="/api/speech", tags=["speech"])


def speech_service(request: Request, auth: Auth) -> SpeechService:
    """Require JWT unless an explicit local-only demo is enabled."""
    settings = request.app.state.settings
    local = request.client and request.client.host in {"127.0.0.1", "::1"}
    origin = request.headers.get("Origin")
    allowed_origins = {*settings.cors_origins, str(request.base_url).rstrip("/")}
    if origin is not None and origin not in allowed_origins:
        raise HTTPException(403, "Speech request origin is not allowed.")
    if not (settings.blaze_local_demo and local and not settings.database_configured):
        authorization = request.headers.get("Authorization", "")
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            raise HTTPException(401, "A bearer token is required.")
        auth.authenticate(token)
    return SpeechService(settings)


Speech = Annotated[SpeechService, Depends(speech_service)]


@router.get("/dictation/{identity}/audio", response_class=Response)
async def dictation(
    identity: Identity, user: User, learning: Learning, service: Speech
) -> Response:
    """Synthesize the stored dictation sentence without exposing its text key."""
    from fastapi.concurrency import run_in_threadpool

    text = await run_in_threadpool(learning.dictation_text, identity)
    preferences = await run_in_threadpool(learning.settings, user["UserId"])
    return Response(
        await service.synthesize(
            TTSRequest(
                text=text,
                speaker_id=preferences.get("speech_voice_id"),
                speed=preferences["speech_rate"],
            )
        ),
        media_type="audio/mpeg",
    )


@router.get("/voices", response_model=list[SpeechVoice])
async def voices(
    service: Speech, language: Annotated[SpeechLanguage, Query()] = "en"
) -> list[SpeechVoice]:
    """List current Blaze voices for the selected learning language."""
    return await service.voices(language)


@router.post(
    "/tts", response_class=Response, responses={200: {"content": {"audio/mpeg": {}}}}
)
async def tts(data: TTSRequest, service: Speech) -> Response:
    """Return synthesized MP3 audio after Blaze completes the job."""
    return Response(await service.synthesize(data), media_type="audio/mpeg")


@router.post("/stt", response_model=STTResponse)
async def stt(
    file: UploadFile,
    service: Speech,
    language: Annotated[SpeechLanguage, Query()] = "en",
) -> STTResponse:
    """Transcribe multipart audio without persisting it to the database."""
    try:
        content = await file.read(MAX_AUDIO + 1)
        return await service.transcribe(content, file.content_type or "", language)
    finally:
        await file.close()
