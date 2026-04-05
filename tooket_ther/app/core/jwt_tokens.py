"""Access and admission JWT helpers (HS256)."""

from __future__ import annotations

import time
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt

from tooket_ther.app.config import settings

TOKEN_TYPE_ACCESS = "access"
TOKEN_TYPE_ADMISSION = "admission"


def _exp_unix(*, minutes: int) -> int:
    return int((datetime.now(UTC) + timedelta(minutes=minutes)).timestamp())


def create_access_token(user_id: uuid.UUID) -> str:
    now = int(time.time())
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "type": TOKEN_TYPE_ACCESS,
        "iat": now,
        "exp": _exp_unix(minutes=settings.jwt_access_expire_minutes),
    }
    return jwt.encode(
        payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm
    )


def create_admission_token(
    user_id: uuid.UUID,
    concert_id: uuid.UUID,
    queue_entry_id: uuid.UUID,
) -> str:
    now = int(time.time())
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "type": TOKEN_TYPE_ADMISSION,
        "concert_id": str(concert_id),
        "queue_entry_id": str(queue_entry_id),
        "iat": now,
        "exp": _exp_unix(minutes=settings.jwt_admission_expire_minutes),
    }
    return jwt.encode(
        payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm
    )


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
    )
