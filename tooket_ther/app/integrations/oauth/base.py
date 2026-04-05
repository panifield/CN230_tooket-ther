from typing import Protocol

from tooket_ther.app.integrations.oauth.types import OAuthProfile


class OAuthProviderClient(Protocol):
    """Strategy: exchange code → provider-specific profile."""

    def exchange_code(self, code: str, redirect_uri: str) -> OAuthProfile: ...
