from __future__ import annotations

import uuid
from datetime import datetime
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from tooket_ther.app.models.concert import Seat
from tooket_ther.app.models.enums import SeatStatus


def list_available(db: Session, zone_id: uuid.UUID) -> Sequence[Seat]:
    stmt = select(Seat).where(
        Seat.zone_id == zone_id,
        Seat.status == SeatStatus.AVAILABLE.value,
    )
    return db.scalars(stmt).all()


def lock_seats(db: Session, seat_ids: list[uuid.UUID], until: datetime) -> Sequence[Seat]:
    """
    Lock seats for update. Raises ValueError if any seat is not available.
    """
    stmt = select(Seat).where(
        Seat.id.in_(seat_ids),
        Seat.status == SeatStatus.AVAILABLE.value,
    ).with_for_update()

    seats = db.scalars(stmt).all()

    if len(seats) != len(seat_ids):
        raise ValueError("Some or all of the requested seats are no longer available")

    for seat in seats:
        seat.status = SeatStatus.LOCKED.value
        seat.locked_until = until

    # Changes will be flushed upon commit of the parent transaction
    return seats
