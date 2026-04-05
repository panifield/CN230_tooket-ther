"""OAuth code exchange → JWT access token."""

from __future__ import annotations

import urllib.parse

import httpx
from sqlalchemy.orm import Session

from tooket_ther.app.config import settings
from tooket_ther.app.core.jwt_tokens import create_access_token
from tooket_ther.app.integrations.oauth.factory import get_oauth_client
from tooket_ther.app.models.enums import OAuthProvider
from tooket_ther.app.repositories import user_repo


def exchange_oauth_code(
    db: Session,
    *,
    provider: str,
    code: str,
    redirect_uri: str,
) -> str:
    client = get_oauth_client(provider)
    try:
        profile = client.exchange_code(code, redirect_uri)
    except httpx.HTTPStatusError as e:
        raise ValueError(
            f"OAuth provider returned HTTP {e.response.status_code}"
        ) from e
    user = user_repo.upsert_user_from_oauth(db, provider=provider.lower().strip(), profile=profile)
    db.commit()
    db.refresh(user)
    return create_access_token(user.id)


def default_redirect_uri(provider: str) -> str:
    p = provider.lower().strip()
    if p == OAuthProvider.LINE.value:
        return settings.oauth_redirect_uri_line
    if p == OAuthProvider.FACEBOOK.value:
        return settings.oauth_redirect_uri_facebook
    raise ValueError(f"Unsupported provider: {provider!r}")


def build_authorization_url(*, provider: str, redirect_uri: str, state: str) -> str:
    p = provider.lower().strip()
    if p == OAuthProvider.LINE.value:
        if not settings.oauth_line_channel_id:
            raise ValueError("oauth_line_channel_id is not set.")
        q = urllib.parse.urlencode(
            {
                "response_type": "code",
                "client_id": settings.oauth_line_channel_id,
                "redirect_uri": redirect_uri,
                "state": state,
                "scope": "profile openid",
            }
        )
        return f"https://access.line.me/oauth2/v2.1/authorize?{q}"
    if p == OAuthProvider.FACEBOOK.value:
        if not settings.oauth_facebook_app_id:
            raise ValueError("oauth_facebook_app_id is not set.")
        q = urllib.parse.urlencode(
            {
                "response_type": "code",
                "client_id": settings.oauth_facebook_app_id,
                "redirect_uri": redirect_uri,
                "state": state,
                "scope": "email,public_profile",
            }
        )
        return f"https://www.facebook.com/v21.0/dialog/oauth?{q}"
    raise ValueError(f"Unsupported provider: {provider!r}")
