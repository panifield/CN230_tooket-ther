from dataclasses import dataclass


@dataclass(frozen=True)
class OAuthProfile:
    """Normalized profile after exchanging an authorization code."""

    subject: str
    display_name: str
    email: str | None = None
