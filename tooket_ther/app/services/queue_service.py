"""Queue: Redis sorted set + persisted queue_entries (design_plan)."""

from __future__ import annotations

import time
import uuid
from datetime import UTC, datetime

import redis
from sqlalchemy.orm import Session

from tooket_ther.app.core.jwt_tokens import create_admission_token
from tooket_ther.app.domain.priority import PriorityStrategy
from tooket_ther.app.models.enums import QueueEntryStatus
from tooket_ther.app.models.queue import QueueEntry
from tooket_ther.app.repositories import concert_repo, queue_repo, user_repo


class QueueServiceError(Exception):
    """Business rule violation for queue operations."""


def _zkey(concert_id: uuid.UUID) -> str:
    return f"tooket:queue:z:{concert_id}"


def join_queue(db: Session, redis_client: redis.Redis, *, concert_id: uuid.UUID, user_id: uuid.UUID) -> QueueEntry:
    concert = concert_repo.get_published_concert(db, concert_id)
    if concert is None:
        raise QueueServiceError("Concert not found or not on sale.")
    if datetime.now(UTC) < concert.sales_starts_at:
        raise QueueServiceError("Sales have not started for this concert.")

    if queue_repo.get_waiting_entry_for_user(db, concert_id=concert_id, user_id=user_id):
        raise QueueServiceError("You already have an active queue entry for this concert.")

    user = user_repo.get_user_by_id(db, user_id)
    if user is None:
        raise QueueServiceError("User not found.")

    PriorityStrategy.sync_user_priority_tier(user, concert)
    score = PriorityStrategy.compute_priority_score(user, concert)

    entry = QueueEntry(
        concert_id=concert_id,
        user_id=user_id,
        priority_score=score,
        status=QueueEntryStatus.WAITING.value,
    )
    db.add(entry)
    try:
        db.flush()
        zscore = -float(score) * 1_000_000_000.0 + time.time()
        redis_client.zadd(_zkey(concert_id), {str(entry.id): zscore})
        db.commit()
    except Exception:
        db.rollback()
        try:
            redis_client.zrem(_zkey(concert_id), str(entry.id))
        except Exception:
            pass
        raise
    db.refresh(entry)
    return entry


def queue_status(
    db: Session, redis_client: redis.Redis, *, concert_id: uuid.UUID, user_id: uuid.UUID
) -> dict:
    latest = queue_repo.get_latest_entry_for_user(db, concert_id=concert_id, user_id=user_id)
    if latest is None:
        return {"in_queue": False, "status": None}

    if latest.status == QueueEntryStatus.ADMITTED.value:
        return {
            "in_queue": False,
            "status": QueueEntryStatus.ADMITTED.value,
            "queue_entry_id": str(latest.id),
        }

    if latest.status != QueueEntryStatus.WAITING.value:
        return {"in_queue": False, "status": latest.status}

    key = _zkey(concert_id)
    rank = redis_client.zrank(key, str(latest.id))
    total = redis_client.zcard(key)
    if rank is None:
        return {
            "in_queue": True,
            "status": QueueEntryStatus.WAITING.value,
            "position": None,
            "total": int(total),
            "note": "Redis out of sync; contact support.",
        }
    return {
        "in_queue": True,
        "status": QueueEntryStatus.WAITING.value,
        "position": int(rank),
        "total": int(total),
        "queue_entry_id": str(latest.id),
    }


def admit_and_issue_token(
    db: Session, redis_client: redis.Redis, *, concert_id: uuid.UUID, user_id: uuid.UUID
) -> str:
    entry = queue_repo.get_waiting_entry_for_user(db, concert_id=concert_id, user_id=user_id)
    if entry is None:
        raise QueueServiceError("No active waiting queue entry.")

    key = _zkey(concert_id)
    rank = redis_client.zrank(key, str(entry.id))
    if rank is None:
        raise QueueServiceError("Queue position unknown; try re-joining.")
    if rank != 0:
        raise QueueServiceError("Not at front of the queue yet.")

    entry.status = QueueEntryStatus.ADMITTED.value
    entry.admitted_at = datetime.now(UTC)
    redis_client.zrem(key, str(entry.id))
    db.commit()
    db.refresh(entry)
    return create_admission_token(user_id, concert_id, entry.id)
