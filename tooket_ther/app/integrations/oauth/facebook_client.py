import httpx

from tooket_ther.app.config import settings
from tooket_ther.app.integrations.oauth.types import OAuthProfile


class FacebookOAuthClient:
    TOKEN_URL = "https://graph.facebook.com/v21.0/oauth/access_token"
    ME_URL = "https://graph.facebook.com/v21.0/me"

    def __init__(self) -> None:
        self._app_id = settings.oauth_facebook_app_id
        self._app_secret = settings.oauth_facebook_app_secret

    def exchange_code(self, code: str, redirect_uri: str) -> OAuthProfile:
        if not self._app_id or not self._app_secret:
            raise ValueError("Facebook OAuth is not configured (oauth_facebook_app_id / secret).")
        params = {
            "client_id": self._app_id,
            "client_secret": self._app_secret,
            "redirect_uri": redirect_uri,
            "code": code,
        }
        with httpx.Client(timeout=30.0) as client:
            tr = client.get(self.TOKEN_URL, params=params)
            tr.raise_for_status()
            tokens = tr.json()
            access_token = tokens.get("access_token")
            if not access_token:
                raise ValueError("Facebook token response missing access_token.")
            mr = client.get(
                self.ME_URL,
                params={"fields": "id,name,email", "access_token": access_token},
            )
            mr.raise_for_status()
            body = mr.json()
        user_id = body.get("id")
        if not user_id:
            raise ValueError("Facebook /me missing id.")
        display_name = body.get("name") or "Facebook User"
        email = body.get("email")
        return OAuthProfile(subject=str(user_id), display_name=display_name, email=email)
