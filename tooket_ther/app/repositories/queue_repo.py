from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from tooket_ther.app.models.enums import QueueEntryStatus
from tooket_ther.app.models.queue import QueueEntry


def get_waiting_entry_for_user(
    db: Session, *, concert_id: uuid.UUID, user_id: uuid.UUID
) -> QueueEntry | None:
    stmt = select(QueueEntry).where(
        QueueEntry.concert_id == concert_id,
        QueueEntry.user_id == user_id,
        QueueEntry.status == QueueEntryStatus.WAITING.value,
    )
    return db.execute(stmt).scalar_one_or_none()


def get_entry_by_id(db: Session, entry_id: uuid.UUID) -> QueueEntry | None:
    return db.get(QueueEntry, entry_id)


def get_latest_entry_for_user(
    db: Session, *, concert_id: uuid.UUID, user_id: uuid.UUID
) -> QueueEntry | None:
    stmt = (
        select(QueueEntry)
        .where(
            QueueEntry.concert_id == concert_id,
            QueueEntry.user_id == user_id,
        )
        .order_by(QueueEntry.entered_at.desc())
        .limit(1)
    )
    return db.execute(stmt).scalar_one_or_none()
