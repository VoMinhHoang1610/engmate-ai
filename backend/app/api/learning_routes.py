"""Authenticated HTTP contracts for the SQL Server learning backend."""

from typing import Annotated, Literal

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Path,
    Query,
    Request,
    Response,
    UploadFile,
)
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import text

from app.api.dependencies import get_ai_service
from app.db.database import Record
from app.schemas.learning import (
    MAX_ID,
    AccountUpdate,
    AttemptCreate,
    AttemptSubmit,
    ConversationCreate,
    EmailRequest,
    FlashcardCreate,
    Login,
    MasteryUpdate,
    MessageCreate,
    PasswordChange,
    ProfileUpdate,
    Refresh,
    Register,
    ResetPassword,
    ReviewCreate,
    SettingsUpdate,
    Versioned,
    VocabularyCreate,
    VocabularyUpdate,
)
from app.services.ai_service import AIService
from app.services.auth import AuthService
from app.services.conversations import ConversationService
from app.services.learning import LearningService
from app.services.media import MediaService
from app.services.practice import PracticeService

router = APIRouter(prefix="/api")
bearer = HTTPBearer()
Identity = Annotated[int, Path(gt=0, le=MAX_ID)]
Offset = Annotated[int, Query(ge=0, le=2147483647)]
Limit = Annotated[int, Query(ge=1, le=100)]


def auth_service(request: Request) -> AuthService:
    """Resolve the application's identity service."""
    return AuthService(
        request.app.state.database, request.app.state.settings, request.app.state.mailer
    )


def learner(request: Request) -> LearningService:
    """Resolve the shared learning database boundary."""
    return LearningService(request.app.state.database)


def conversation_service(request: Request) -> ConversationService:
    """Resolve private conversation persistence."""
    return ConversationService(request.app.state.database)


def practice_service(request: Request) -> PracticeService:
    """Resolve lesson attempt persistence and grading."""
    return PracticeService(request.app.state.database)


def media_service(request: Request) -> MediaService:
    """Resolve private asset storage."""
    return MediaService(request.app.state.database, request.app.state.settings)


Auth = Annotated[AuthService, Depends(auth_service)]
Learning = Annotated[LearningService, Depends(learner)]
Conversations = Annotated[ConversationService, Depends(conversation_service)]
Practice = Annotated[PracticeService, Depends(practice_service)]
Media = Annotated[MediaService, Depends(media_service)]
AI = Annotated[AIService, Depends(get_ai_service)]


def current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer)], service: Auth
) -> Record:
    """Reject unauthenticated or revoked sessions before private resource access."""
    return service.authenticate(credentials.credentials)


User = Annotated[Record, Depends(current_user)]


@router.get("/ready", tags=["health"])
def ready(request: Request) -> Record:
    """Readiness requires the database, all tables/views and schema version one."""
    database = request.app.state.database
    with database.transaction() as connection:
        version = connection.execute(
            text("SELECT MAX(Version) FROM em.SchemaVersions")
        ).scalar_one()
        if version != 1:
            raise HTTPException(503, "Unsupported database schema version.")
        for name in database.models.table_names:
            database.models.table(name, connection)
    return {"status": "ok", "database": "sqlserver", "schema_version": version}


@router.post("/auth/register", status_code=201, tags=["auth"])
def register(data: Register, service: Auth) -> Record:
    """Register a real account, profile and initial session atomically."""
    return service.register(data)


@router.post("/auth/login", tags=["auth"])
def login(data: Login, service: Auth) -> Record:
    """Sign in with username/email and password."""
    return service.login(data)


@router.post("/auth/refresh", tags=["auth"])
def refresh(data: Refresh, service: Auth) -> Record:
    """Rotate an opaque refresh token once."""
    return service.refresh(data.refresh_token)


@router.post("/auth/logout", status_code=204, tags=["auth"])
def logout(user: User, service: Auth, all_sessions: bool = False) -> Response:
    """Revoke the current session or all of this account's sessions."""
    service.logout(user, all_sessions)
    return Response(status_code=204)


@router.post("/auth/change-password", status_code=204, tags=["auth"])
def change_password(data: PasswordChange, user: User, service: Auth) -> Response:
    """Change password and require sign-in again on all devices."""
    service.change_password(
        user,
        data.current_password.get_secret_value(),
        data.new_password.get_secret_value(),
    )
    return Response(status_code=204)


@router.post("/auth/forgot-password", status_code=202, tags=["auth"])
def forgot_password(data: EmailRequest, service: Auth) -> Record:
    """Send an optional SMTP reset link without exposing whether email exists."""
    service.forgot_password(data.email)
    return {
        "detail": "If an eligible account exists, a reset email has been requested."
    }


@router.post("/auth/reset-password", status_code=204, tags=["auth"])
def reset_password(data: ResetPassword, service: Auth) -> Response:
    """Consume a single-use reset token and revoke existing sessions."""
    service.reset_password(data.token, data.new_password.get_secret_value())
    return Response(status_code=204)


@router.get("/me", tags=["account"])
def me(user: User, service: Auth) -> Record:
    """Return account fields without password/session hashes."""
    return service.user_public(user)


@router.put("/me/account", tags=["account"])
def update_account(data: AccountUpdate, user: User, service: Auth) -> Record:
    """Update account identity after confirming the password and rowversion."""
    return service.update_account(user, data)


@router.get("/me/profile", tags=["account"])
def profile(user: User, service: Learning) -> Record:
    """Read the authenticated learner's profile."""
    return service.profile(user["UserId"])


@router.put("/me/profile", tags=["account"])
def update_profile(data: ProfileUpdate, user: User, service: Learning) -> Record:
    """Save profile fields with their last read rowversion."""
    return service.update_profile(user["UserId"], data)


@router.get("/me/settings", tags=["account"])
def settings(user: User, service: Learning) -> Record:
    """Read display/audio preferences."""
    return service.settings(user["UserId"])


@router.put("/me/settings", tags=["account"])
def update_settings(data: SettingsUpdate, user: User, service: Learning) -> Record:
    """Save preferences using optimistic concurrency."""
    return service.update_settings(user["UserId"], data)


@router.get("/topics", tags=["catalogue"])
def topics(service: Learning) -> list[Record]:
    """Return the public roleplay catalogue."""
    return service.topics()


@router.get("/lessons", tags=["catalogue"])
def lessons(
    service: Learning,
    skill: Literal["speaking", "listening", "writing"] | None = None,
    offset: Offset = 0,
    limit: Limit = 50,
) -> list[Record]:
    """Return a bounded page of published lesson revisions."""
    return service.lessons(skill, offset, limit)


@router.get("/lessons/{identity}", tags=["catalogue"])
def lesson(identity: Identity, service: Learning) -> Record:
    """Return lesson instructions and questions without the answer key."""
    return service.lesson(identity)


@router.get("/vocabulary", tags=["vocabulary"])
def vocabulary(
    user: User,
    service: Learning,
    offset: Offset = 0,
    limit: Limit = 50,
    due: bool = False,
    search: Annotated[str, Query(max_length=120)] = "",
    mastered: bool | None = None,
) -> list[Record]:
    """List the caller's active notebook or due cards."""
    return service.vocabulary(user["UserId"], offset, limit, due, search, mastered)


@router.post("/vocabulary", status_code=201, tags=["vocabulary"])
def add_vocabulary(data: VocabularyCreate, user: User, service: Learning) -> Record:
    """Save a private word and optional owned source."""
    return service.add_vocabulary(user["UserId"], data)


@router.put("/vocabulary/{identity}", tags=["vocabulary"])
def update_vocabulary(
    identity: Identity, data: VocabularyUpdate, user: User, service: Learning
) -> Record:
    """Edit content without overwriting server review metadata."""
    return service.update_vocabulary(user["UserId"], identity, data)


@router.delete("/vocabulary/{identity}", status_code=204, tags=["vocabulary"])
def archive_vocabulary(
    identity: Identity, data: Versioned, user: User, service: Learning
) -> Response:
    """Archive a word while preserving historic reviews."""
    service.archive_vocabulary(user["UserId"], identity, data.version)
    return Response(status_code=204)


@router.post("/flashcards/sessions", status_code=201, tags=["flashcards"])
def start_flashcards(data: FlashcardCreate, user: User, service: Learning) -> Record:
    """Start a due-only or review-all flashcard session once."""
    return service.start_flashcards(user["UserId"], data)


@router.put("/vocabulary/{identity}/mastery", tags=["vocabulary"])
def update_mastery(
    identity: Identity, data: MasteryUpdate, user: User, service: Learning
) -> Record:
    """Save the notebook's self-assessed mastery without changing review history."""
    return service.update_mastery(user["UserId"], identity, data)


@router.post("/flashcards/sessions/{identity}/reviews", tags=["flashcards"])
def review(
    identity: Identity, data: ReviewCreate, user: User, service: Learning
) -> Record:
    """Rate a word with an idempotent client request UUID."""
    return service.review(user["UserId"], identity, data)


@router.post("/flashcards/sessions/{identity}/close", tags=["flashcards"])
def close_flashcards(
    identity: Identity, user: User, service: Learning, abandoned: bool = False
) -> Record:
    """Complete the session once or abandon it without time credits."""
    return service.close_flashcards(user["UserId"], identity, abandoned)


@router.get("/dashboard", tags=["statistics"])
def dashboard(
    user: User, service: Learning, days: Annotated[int, Query(ge=1, le=365)] = 30
) -> Record:
    """Return totals and local-date daily aggregates from the SQL views."""
    return service.dashboard(user["UserId"], days)


@router.get("/evaluations/{identity}", tags=["ai-history"])
def evaluation(identity: Identity, user: User, service: Learning) -> Record:
    """Read a private AI job; mock jobs have no real corrections."""
    return service.evaluation(user["UserId"], identity)


@router.post("/evaluations/{identity}/cancel", tags=["ai-history"])
def cancel_evaluation(identity: Identity, user: User, service: Learning) -> Record:
    """Cancel a pending or interrupted AI job so the conversation can continue."""
    return service.cancel_evaluation(user["UserId"], identity)


@router.post("/conversations", status_code=201, tags=["conversations"])
def start_conversation(
    data: ConversationCreate, user: User, service: Conversations
) -> Record:
    """Start roleplay/free chat with a snapshotted prompt context."""
    return service.start(user["UserId"], data)


@router.get("/conversations", tags=["conversations"])
def conversations(
    user: User, service: Conversations, offset: Offset = 0, limit: Limit = 50
) -> list[Record]:
    """Read only the authenticated learner's conversation history."""
    return service.history(user["UserId"], offset, limit)


@router.get("/conversations/{identity}/messages", tags=["conversations"])
def messages(
    identity: Identity,
    user: User,
    service: Conversations,
    offset: Offset = 0,
    limit: Limit = 50,
) -> list[Record]:
    """Return a private, ordered page of conversation turns."""
    return service.messages(user["UserId"], identity, offset, limit)


@router.post("/conversations/{identity}/messages", tags=["conversations"])
async def send_message(
    identity: Identity, data: MessageCreate, user: User, service: Conversations, ai: AI
) -> Record:
    """Save the user turn, generate a mock reply, and finalize durable history."""
    return await service.send(user["UserId"], identity, data, ai.client)


@router.post("/conversations/{identity}/close", tags=["conversations"])
def close_conversation(
    identity: Identity, user: User, service: Conversations, abandoned: bool = False
) -> Record:
    """Finish or abandon an owned conversation once."""
    return service.close(user["UserId"], identity, abandoned)


@router.post("/practice/attempts", status_code=201, tags=["practice"])
def start_attempt(data: AttemptCreate, user: User, service: Practice) -> Record:
    """Start a lesson revision before measuring practice time."""
    return service.start(user["UserId"], data)


@router.get("/practice/attempts", tags=["practice"])
def attempts(
    user: User, service: Practice, offset: Offset = 0, limit: Limit = 50
) -> list[Record]:
    """Return the authenticated learner's exercise history."""
    return service.list_attempts(user["UserId"], offset, limit)


@router.get("/practice/attempts/{identity}", tags=["practice"])
def attempt(identity: Identity, user: User, service: Practice) -> Record:
    """Read saved answers, score and labelled AI feedback for an owned attempt."""
    return service.detail(user["UserId"], identity)


@router.post("/practice/attempts/{identity}/submit", tags=["practice"])
async def submit_attempt(
    identity: Identity, data: AttemptSubmit, user: User, service: Practice, ai: AI
) -> Record:
    """Score listening on the server; keep mock writing/speaking ungraded."""
    return await service.submit(user["UserId"], identity, data, ai.client)


@router.post("/practice/attempts/{identity}/abandon", tags=["practice"])
def abandon_attempt(identity: Identity, user: User, service: Practice) -> Record:
    """Abandon unfinished practice without time credits."""
    return service.abandon(user["UserId"], identity)


@router.post("/media", status_code=201, tags=["media"])
async def upload_media(
    file: UploadFile,
    user: User,
    service: Media,
    purpose: Literal["avatar", "recording"] = "avatar",
) -> Record:
    """Accept a bounded multipart file and measure recording duration server-side."""
    content = await file.read(8 * 1024 * 1024 + 1)
    content_type = (file.content_type or "").split(";")[0].lower()
    return await run_in_threadpool(
        service.upload, user["UserId"], purpose, content_type, content
    )


@router.get("/media/{identity}", tags=["media"])
def download_media(identity: Identity, user: User, service: Media) -> FileResponse:
    """Serve assets only to their authenticated owner, never from a public folder."""
    path, content_type = service.download(user["UserId"], identity)
    return FileResponse(
        path,
        media_type=content_type,
        headers={
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )
