from collections.abc import Generator
import uuid

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis import Redis
from sqlalchemy.orm import Session

from tooket_ther.app.core.jwt_tokens import TOKEN_TYPE_ACCESS, decode_token
from tooket_ther.app.database import SessionLocal
from tooket_ther.app.models.user import User
from tooket_ther.app.repositories.user_repo import get_user_by_id

security = HTTPBearer(auto_error=True)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency: one request-scoped DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_redis(request: Request) -> Redis:
    """Redis client from app lifespan (required for queue)."""
    client = getattr(request.app.state, "redis", None)
    if client is None:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Redis is not available.",
        )
    return client


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Validate access JWT and load the user row."""
    try:
        payload = decode_token(creds.credentials)
    except jwt.ExpiredSignatureError as e:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, detail="Token expired"
        ) from e
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        ) from e
    if payload.get("type") != TOKEN_TYPE_ACCESS:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, detail="Invalid token type"
        )
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, detail="Missing subject"
        )
    try:
        uid = uuid.UUID(str(sub))
    except ValueError as e:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, detail="Invalid user id"
        ) from e
    user = get_user_by_id(db, uid)
    if user is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )
    return user
