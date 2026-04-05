from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from tooket_ther.app.integrations.oauth.types import OAuthProfile
from tooket_ther.app.models.user import User, UserIdentity


def get_user_by_id(db: Session, user_id: uuid.UUID) -> User | None:
    return db.get(User, user_id)


def get_identity_by_provider_subject(
    db: Session, *, provider: str, subject: str
) -> UserIdentity | None:
    stmt = select(UserIdentity).where(
        UserIdentity.provider == provider,
        UserIdentity.provider_subject == subject,
    )
    return db.execute(stmt).scalar_one_or_none()


def upsert_user_from_oauth(
    db: Session, *, provider: str, profile: OAuthProfile
) -> User:
    """One social account → one user; update display name on repeat login."""
    existing = get_identity_by_provider_subject(
        db, provider=provider, subject=profile.subject
    )
    if existing:
        user = existing.user
        user.display_name = profile.display_name
        if profile.email:
            user.email = profile.email
        db.flush()
        return user

    user = User(
        display_name=profile.display_name,
        email=profile.email,
    )
    db.add(user)
    db.flush()
    identity = UserIdentity(
        user_id=user.id,
        provider=provider,
        provider_subject=profile.subject,
    )
    db.add(identity)
    db.flush()
    return user
