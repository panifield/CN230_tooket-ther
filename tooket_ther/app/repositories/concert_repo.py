from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from tooket_ther.app.models.concert import Concert
from tooket_ther.app.models.enums import ConcertStatus


def get_concert_by_id(db: Session, concert_id: uuid.UUID) -> Concert | None:
    return db.get(Concert, concert_id)


def get_published_concert(db: Session, concert_id: uuid.UUID) -> Concert | None:
    stmt = select(Concert).where(
        Concert.id == concert_id,
        Concert.status == ConcertStatus.PUBLISHED.value,
    )
    return db.execute(stmt).scalar_one_or_none()
