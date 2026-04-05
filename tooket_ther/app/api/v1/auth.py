from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from tooket_ther.app.api.deps import get_db
from tooket_ther.app.schemas.auth import AuthorizeUrlResponse, OAuthTokenRequest, OAuthTokenResponse
from tooket_ther.app.services import auth_service

router = APIRouter()


@router.get("/oauth/{provider}/authorize-url", response_model=AuthorizeUrlResponse)
def oauth_authorize_url(
    provider: str,
    state: str,
    redirect_uri: str | None = None,
) -> AuthorizeUrlResponse:
    """คืน URL ให้ frontend redirect ผู้ใช้ไป Line / Facebook login."""
    rid = redirect_uri or auth_service.default_redirect_uri(provider)
    try:
        url = auth_service.build_authorization_url(
            provider=provider, redirect_uri=rid, state=state
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    
    print(f"\n[DEBUG] Created {provider} Auth URL: {url}\n")
    return AuthorizeUrlResponse(authorization_url=url, state=state)


@router.post("/oauth/token", response_model=OAuthTokenResponse)
def oauth_token(
    body: OAuthTokenRequest,
    db: Session = Depends(get_db),
) -> OAuthTokenResponse:
    """แลก authorization code → access JWT (ใช้ใน Authorization: Bearer)."""
    rid = body.redirect_uri or auth_service.default_redirect_uri(body.provider)
    try:
        token = auth_service.exchange_oauth_code(
            db,
            provider=body.provider,
            code=body.code,
            redirect_uri=rid,
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    return OAuthTokenResponse(access_token=token)
