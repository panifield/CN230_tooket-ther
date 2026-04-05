from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, time

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from tooket_ther.app.models.concert import Concert, Seat, Zone
from tooket_ther.app.models.enums import ConcertStatus, SeatStatus


def get_concert_by_id(db: Session, concert_id: uuid.UUID) -> Concert | None:
    return db.get(Concert, concert_id)


def get_published_concert(db: Session, concert_id: uuid.UUID) -> Concert | None:
    stmt = select(Concert).where(
        Concert.id == concert_id,
        Concert.status == ConcertStatus.PUBLISHED.value,
    )
    return db.execute(stmt).scalar_one_or_none()


def get_published_concert_with_zones(db: Session, concert_id: uuid.UUID) -> Concert | None:
    stmt = (
        select(Concert)
        .where(
            Concert.id == concert_id,
            Concert.status == ConcertStatus.PUBLISHED.value,
        )
        .options(selectinload(Concert.zones))
    )
    return db.execute(stmt).scalar_one_or_none()


def get_published_concert_with_zones_and_seats(db: Session, concert_id: uuid.UUID) -> Concert | None:
    stmt = (
        select(Concert)
        .where(
            Concert.id == concert_id,
            Concert.status == ConcertStatus.PUBLISHED.value,
        )
        .options(
            selectinload(Concert.zones).selectinload(Zone.seats),
        )
    )
    return db.execute(stmt).scalar_one_or_none()


def list_published_concerts(
    db: Session,
    *,
    venue_q: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[Concert]:
    stmt = (
        select(Concert)
        .where(Concert.status == ConcertStatus.PUBLISHED.value)
        .options(selectinload(Concert.zones))
        .order_by(Concert.starts_at.asc())
    )
    if venue_q and venue_q.strip():
        stmt = stmt.where(Concert.venue.ilike(f"%{venue_q.strip()}%"))
    if date_from is not None:
        start = datetime.combine(date_from, time.min, tzinfo=UTC)
        stmt = stmt.where(Concert.starts_at >= start)
    if date_to is not None:
        end = datetime.combine(date_to, time(23, 59, 59, 999999), tzinfo=UTC)
        stmt = stmt.where(Concert.starts_at <= end)
    return list(db.execute(stmt).unique().scalars().all())


def count_available_seats_in_zone(db: Session, zone_id: uuid.UUID) -> int:
    n = db.scalar(
        select(func.count())
        .select_from(Seat)
        .where(
            Seat.zone_id == zone_id,
            Seat.status == SeatStatus.AVAILABLE.value,
        )
    )
    return int(n or 0)


