"""Application factory and ASGI entry point."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import DBAPIError, IntegrityError, NoSuchTableError

from app.api.chat_routes import router as chat_router
from app.api.learning_routes import router as learning_router
from app.api.routes import router
from app.api.speech_routes import router as speech_router
from app.api.voice_routes import router as voice_router
from app.core.admission import Admission
from app.core.config import Settings, get_settings
from app.core.request_limits import RequestLimits
from app.core.voice_timing import VoiceTimingMiddleware
from app.db.database import Database
from app.services.blaze_stt import BlazeSTTManager
from app.services.gemini_voice import GeminiVoiceManager
from app.services.realtime import RealtimeManager
from app.services.speech import VoiceCatalogCache


def create_app(
    settings: Settings | None = None,
    database: Database | None = None,
) -> FastAPI:
    """Create an isolated application for development and integration tests."""
    config = settings if settings is not None else get_settings()
    db = database if database is not None else Database(config)

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        """Release pools on shutdown; migrations remain an explicit operator action."""
        latency_logger = logging.getLogger("engmate.voice.latency")
        previous_level = latency_logger.level
        handler = logging.StreamHandler() if config.voice_timing_logs else None
        if handler is not None:
            handler.setFormatter(logging.Formatter("%(message)s"))
            latency_logger.addHandler(handler)
            latency_logger.setLevel(logging.INFO)
        async with (
            httpx.AsyncClient(
                base_url="https://api.blaze.vn",
                timeout=30,
                follow_redirects=False,
                limits=httpx.Limits(
                    max_connections=32,
                    max_keepalive_connections=16,
                    keepalive_expiry=60,
                ),
            ) as speech_http,
            httpx.AsyncClient(
                timeout=httpx.Timeout(30, connect=10),
                follow_redirects=False,
                trust_env=False,
                limits=httpx.Limits(
                    max_connections=32,
                    max_keepalive_connections=16,
                    keepalive_expiry=60,
                ),
            ) as gemini_http,
        ):
            application.state.speech_http = speech_http
            application.state.gemini_http = gemini_http
            try:
                yield
            finally:
                try:
                    await application.state.voice.shutdown()
                finally:
                    try:
                        await application.state.blaze_stt.shutdown()
                        await application.state.speech_admission.shutdown()
                        await application.state.chat_admission.shutdown()
                    finally:
                        application.state.speech_http = None
                        application.state.gemini_http = None
                        db.close()
                        if handler is not None:
                            latency_logger.removeHandler(handler)
                            latency_logger.setLevel(previous_level)
                            handler.close()

    application = FastAPI(title=config.app_name, version="0.2.0", lifespan=lifespan)
    application.state.settings = config
    application.state.database = db
    application.state.chat_jobs = {}
    application.state.chat_admission = Admission(
        config.chat_max_jobs, config.chat_max_jobs_per_user
    )
    application.state.speech_admission = Admission(
        config.speech_max_jobs, config.speech_max_jobs_per_user
    )
    application.state.speech_catalog = VoiceCatalogCache()
    application.state.blaze_stt = BlazeSTTManager(config)
    application.state.speech_http = None
    application.state.gemini_http = None
    application.state.voice = (
        GeminiVoiceManager(config, db)
        if config.voice_provider == "native" and config.llm_provider == "gemini"
        else RealtimeManager(config, db)
    )
    application.add_middleware(
        RequestLimits, auth_limit=config.auth_requests_per_minute
    )
    application.add_middleware(VoiceTimingMiddleware)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=config.cors_origins,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Content-Type", "Authorization"],
    )
    application.include_router(router)
    application.include_router(chat_router)
    application.include_router(learning_router)
    application.include_router(speech_router)
    application.include_router(voice_router)

    @application.exception_handler(RequestValidationError)
    async def validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """Keep passwords, tokens and request bodies out of validation responses."""
        return JSONResponse(
            status_code=422,
            content={
                "detail": [
                    {key: error[key] for key in ("loc", "msg", "type")}
                    for error in exc.errors()
                ]
            },
        )

    @application.exception_handler(IntegrityError)
    async def integrity_error(request: Request, exc: IntegrityError) -> JSONResponse:
        """Translate SQL constraints without exposing statements or parameter values."""
        duplicate = (
            "2601" in str(exc.orig)
            or "2627" in str(exc.orig)
            or getattr(exc.orig, "args", (None,))[0] == 1062
        )
        return JSONResponse(
            status_code=409 if duplicate else 422,
            content={
                "detail": (
                    "Resource already exists."
                    if duplicate
                    else "Data violates a database constraint."
                )
            },
        )

    @application.exception_handler(DBAPIError)
    @application.exception_handler(NoSuchTableError)
    async def database_error(request: Request, exc: Exception) -> JSONResponse:
        """Expose an actionable but secret-free database availability error."""
        return JSONResponse(
            status_code=503,
            content={
                "detail": "Database unavailable; check connection and apply migrations."
            },
        )

    return application


app = create_app()
