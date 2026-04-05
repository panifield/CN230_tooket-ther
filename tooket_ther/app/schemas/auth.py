from typing import Literal

from pydantic import BaseModel, Field


class OAuthTokenRequest(BaseModel):
    provider: Literal["line", "facebook"]
    code: str = Field(min_length=1)
    redirect_uri: str | None = Field(
        default=None,
        description="Must match the redirect_uri sent to the provider; defaults from server config.",
    )


class OAuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthorizeUrlResponse(BaseModel):
    authorization_url: str
    state: str
