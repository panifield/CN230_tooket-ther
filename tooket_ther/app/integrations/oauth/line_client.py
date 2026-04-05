import httpx

from tooket_ther.app.config import settings
from tooket_ther.app.integrations.oauth.types import OAuthProfile


class LineOAuthClient:
    TOKEN_URL = "https://api.line.me/oauth2/v2.1/token"
    PROFILE_URL = "https://api.line.me/v2/profile"

    def __init__(self) -> None:
        self._client_id = settings.oauth_line_channel_id
        self._client_secret = settings.oauth_line_channel_secret

    def exchange_code(self, code: str, redirect_uri: str) -> OAuthProfile:
        if not self._client_id or not self._client_secret:
            raise ValueError("Line OAuth is not configured (oauth_line_channel_id / secret).")
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "client_id": self._client_id,
            "client_secret": self._client_secret,
        }
        with httpx.Client(timeout=30.0) as client:
            tr = client.post(
                self.TOKEN_URL,
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            tr.raise_for_status()
            tokens = tr.json()
            access_token = tokens.get("access_token")
            if not access_token:
                raise ValueError("Line token response missing access_token.")
            pr = client.get(
                self.PROFILE_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            pr.raise_for_status()
            body = pr.json()
        user_id = body.get("userId")
        if not user_id:
            raise ValueError("Line profile missing userId.")
        display_name = body.get("displayName") or "Line User"
        return OAuthProfile(subject=str(user_id), display_name=display_name, email=None)
