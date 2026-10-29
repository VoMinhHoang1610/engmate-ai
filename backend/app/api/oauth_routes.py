"""OAuth initiation and a credential-free URL callback for same-origin popups."""

import json
import secrets
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Request, Response
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import HTMLResponse
from pydantic import Field, SecretStr
from sqlalchemy.exc import DBAPIError

from app.api.chat_routes import Auth
from app.schemas.chat import Input
from app.schemas.responses import TokensResponse
from app.services.oauth import (
    FLOW_SECONDS,
    GoogleLinkRequired,
    OAuthService,
    Provider,
    link_google_identity,
    sign_in,
)

router = APIRouter(prefix="/api/auth/oauth", tags=["auth"])


class GoogleLinkConfirmation(Input):
    """Only an opaque ticket and existing password may confirm account linking."""

    ticket: str = Field(min_length=30, max_length=128)
    password: SecretStr = Field(min_length=1, max_length=128)


@router.post("/google/link", response_model=TokensResponse)
def confirm_google_link(
    data: GoogleLinkConfirmation, request: Request, response: Response, auth: Auth
) -> dict[str, object]:
    """Require Google proof, browser binding and the local password together."""
    service: OAuthService = request.app.state.oauth
    if request.headers.get("origin") != service.settings.oauth_public_origin:
        raise HTTPException(403, "Unexpected sign-in origin.")
    identity = service.consume_google_link(
        data.ticket, request.cookies.get("engmate_google_link", "")
    )
    tokens = link_google_identity(auth, identity, data.password.get_secret_value())
    response.delete_cookie("engmate_google_link", path="/api/auth/oauth/google")
    return tokens


@router.post("/{provider}/start")
def start(provider: Provider, request: Request, response: Response) -> dict[str, str]:
    """Start only from the configured frontend origin; secrets stay in the backend."""
    service: OAuthService = request.app.state.oauth
    if request.headers.get("origin") != service.settings.oauth_public_origin:
        raise HTTPException(403, "Unexpected sign-in origin.")
    url, state, cookie = service.start(provider)
    response.set_cookie(
        f"engmate_oauth_{provider}",
        cookie,
        max_age=FLOW_SECONDS,
        httponly=True,
        secure=service.settings.oauth_public_origin.startswith("https://"),
        samesite="lax",
        path=f"/api/auth/oauth/{provider}",
    )
    return {"url": url, "state": state}


@router.get("/{provider}/callback", response_class=HTMLResponse)
async def callback(
    provider: Provider,
    request: Request,
    auth: Auth,
    state: Annotated[str, Query(min_length=20, max_length=128)],
    code: Annotated[str | None, Query(max_length=4096)] = None,
    error: Annotated[str | None, Query(max_length=256)] = None,
) -> HTMLResponse:
    """Consume the browser-bound flow before exchanging the provider code."""
    service: OAuthService = request.app.state.oauth
    payload: dict[str, object] = {
        "type": "engmate-oauth",
        "provider": provider,
        "state": state,
    }
    link_cookie: str | None = None
    try:
        flow = service.consume(
            provider, state, request.cookies.get(f"engmate_oauth_{provider}", "")
        )
        if error or not code:
            raise HTTPException(400, "Sign-in was cancelled.")
        identity = await service.identity(provider, code, flow.verifier)
        try:
            payload["tokens"] = await run_in_threadpool(
                sign_in, auth, provider, identity
            )
        except GoogleLinkRequired:
            ticket, link_cookie = service.pending_google_link(identity)
            payload["link_ticket"] = ticket
    except HTTPException as exc:
        payload["error"] = {
            400: "Phiên đăng nhập đã hết hạn hoặc bị hủy. Hãy thử lại.",
            401: "Không xác minh được tài khoản hoặc tài khoản đã bị khóa.",
            409: (
                "Email này đã có tài khoản. "
                "Hãy dùng cách đăng nhập ban đầu để giữ nguyên dữ liệu."
            ),
            503: (
                "Đăng nhập nền tảng chưa sẵn sàng. "
                "Cần kiểm tra cấu hình và bảng liên kết tài khoản."
            ),
        }.get(exc.status_code, "Chưa đăng nhập được. Hãy cấp quyền email và thử lại.")
    except DBAPIError:
        payload["error"] = "Chưa kết nối được dữ liệu tài khoản. Hãy thử lại sau."
    nonce = secrets.token_urlsafe(20)
    message = json.dumps(payload, ensure_ascii=True, default=str).replace(
        "<", "\\u003c"
    )
    origin = json.dumps(service.settings.oauth_public_origin)
    html = f"""<!doctype html><html lang="vi"><meta charset="utf-8">
<title>Đăng nhập EngMate AI</title>
<p>Bạn có thể đóng cửa sổ này và quay lại EngMate AI.</p>
<script nonce="{nonce}">if(window.opener){{
window.opener.postMessage({message},{origin});window.close();
}}</script></html>"""
    response = HTMLResponse(
        html,
        headers={
            "Cache-Control": "no-store",
            "Referrer-Policy": "no-referrer",
            "Content-Security-Policy": (
                f"default-src 'none'; script-src 'nonce-{nonce}'; "
                "base-uri 'none'; frame-ancestors 'none'"
            ),
            "X-Content-Type-Options": "nosniff",
        },
    )
    response.delete_cookie(
        f"engmate_oauth_{provider}", path=f"/api/auth/oauth/{provider}"
    )
    if link_cookie:
        response.set_cookie(
            "engmate_google_link",
            link_cookie,
            max_age=300,
            httponly=True,
            secure=service.settings.oauth_public_origin.startswith("https://"),
            samesite="lax",
            path="/api/auth/oauth/google",
        )
    return response
