"""Factory: pick OAuth client by provider name (design_plan / plan)."""

from tooket_ther.app.integrations.oauth.base import OAuthProviderClient
from tooket_ther.app.integrations.oauth.facebook_client import FacebookOAuthClient
from tooket_ther.app.integrations.oauth.line_client import LineOAuthClient
from tooket_ther.app.models.enums import OAuthProvider


def get_oauth_client(provider: str) -> OAuthProviderClient:
    p = provider.lower().strip()
    if p == OAuthProvider.LINE.value:
        return LineOAuthClient()
    if p == OAuthProvider.FACEBOOK.value:
        return FacebookOAuthClient()
    raise ValueError(f"Unsupported OAuth provider: {provider!r}")
