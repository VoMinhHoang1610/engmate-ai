"""Speech endpoints with authenticated access and opt-in loopback demo."""

import asyncio
from collections.abc import AsyncIterator, Coroutine
from typing import Annotated, Any, TypeVar

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
)

from app.api.chat_routes import Auth
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
        user_id = auth.authenticate(token)["UserId"]
    else:
        user_id = 0
    request.state.speech_user_id = user_id
    return SpeechService(
        settings,
        http_client=request.app.state.speech_http,
        catalog_cache=request.app.state.speech_catalog,
    )


Speech = Annotated[SpeechService, Depends(speech_service)]


async def bounded_speech(
    request: Request, service: Speech
) -> AsyncIterator[SpeechService]:
    """Admit one entire generation/transcription, after speech authentication."""
    async with request.app.state.speech_admission.slot(
        getattr(request.state, "speech_user_id", 0)
    ):
        yield service


BoundedSpeech = Annotated[SpeechService, Depends(bounded_speech)]

Result = TypeVar("Result")


async def connected_job(request: Request, work: Coroutine[Any, Any, Result]) -> Result:
    """Stop local polling/download when an HTTP browser has already disconnected."""

    async def disconnected() -> None:
        # The route has already consumed its JSON/multipart body. A direct receive
        # avoids polling and cancellation scopes swallowing task cancellation.
        while (await request.receive())["type"] != "http.disconnect":
            pass

    task = asyncio.create_task(work)
    monitor = asyncio.create_task(disconnected())
    try:
        done, _ = await asyncio.wait(
            [task, monitor], return_when=asyncio.FIRST_COMPLETED
        )
        if task in done:
            return task.result()
        raise HTTPException(499, "Speech client disconnected.")
    finally:
        task.cancel()
        monitor.cancel()
        await asyncio.gather(task, monitor, return_exceptions=True)


@router.get("/voices", response_model=list[SpeechVoice])
async def voices(
    service: Speech, language: Annotated[SpeechLanguage, Query()] = "en"
) -> list[SpeechVoice]:
    """List current Blaze voices for the selected learning language."""
    return await service.voices(language)


@router.post(
    "/tts", response_class=Response, responses={200: {"content": {"audio/mpeg": {}}}}
)
async def tts(data: TTSRequest, service: BoundedSpeech, request: Request) -> Response:
    """Return synthesized MP3 audio after Blaze completes the job."""
    return Response(
        await connected_job(request, service.synthesize(data)), media_type="audio/mpeg"
    )


@router.post("/stt", response_model=STTResponse)
async def stt(
    file: UploadFile,
    service: BoundedSpeech,
    request: Request,
    language: Annotated[SpeechLanguage, Query()] = "en",
) -> STTResponse:
    """Transcribe multipart audio without persisting it to the database."""
    try:
        content = await file.read(MAX_AUDIO + 1)
        return await connected_job(
            request, service.transcribe(content, file.content_type or "", language)
        )
    finally:
        await file.close()
