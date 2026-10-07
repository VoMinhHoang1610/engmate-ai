"""Application factory and ASGI entry point."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import DBAPIError, IntegrityError, NoSuchTableError

from app.api.learning_routes import router as learning_router
from app.api.routes import router
from app.core.config import Settings, get_settings
from app.core.request_limits import RequestLimits
from app.db.database import Database
from app.services.auth import Mailer, SMTPMailer


def create_app(
    settings: Settings | None = None,
    database: Database | None = None,
    mailer: Mailer | None = None,
) -> FastAPI:
    """Create an isolated application for development and integration tests."""
    config = settings if settings is not None else get_settings()
    db = database if database is not None else Database(config)

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        """Release pools on shutdown; migrations remain an explicit operator action."""
        yield
        db.close()

    application = FastAPI(title=config.app_name, version="0.2.0", lifespan=lifespan)
    application.state.settings = config
    application.state.database = db
    application.state.mailer = mailer if mailer is not None else SMTPMailer(config)
    application.add_middleware(
        RequestLimits, auth_limit=config.auth_requests_per_minute
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=config.cors_origins,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Content-Type", "Authorization"],
    )
    application.include_router(router)
    application.include_router(learning_router)

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
        duplicate = "2601" in str(exc.orig) or "2627" in str(exc.orig)
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
