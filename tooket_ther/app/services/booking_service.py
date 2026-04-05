from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from tooket_ther.app.models.booking import Booking
from tooket_ther.app.models.enums import BookingStatus
from tooket_ther.app.repositories import seat_repo


def create_hold(
    db: Session,
    user_id: uuid.UUID,
    concert_id: uuid.UUID,
    seat_ids: list[uuid.UUID],
    hold_minutes: int = 15,
) -> list[Booking]:
    """
    Create bookings in pending_payment status and lock the requested seats.
    This operation should be wrapped in a transaction (db.commit() by caller).
    """
    valid_until = datetime.now(timezone.utc) + timedelta(minutes=hold_minutes)

    # 1. Lock seats (with_for_update)
    locked_seats = seat_repo.lock_seats(db, seat_ids, valid_until)

    # 2. Create bookings
    bookings = []
    for seat in locked_seats:
        booking = Booking(
            user_id=user_id,
            concert_id=concert_id,
            seat_id=seat.id,
            status=BookingStatus.PENDING_PAYMENT.value,
            locked_until=valid_until,
        )
        db.add(booking)
        bookings.append(booking)

    db.flush()
    return bookings
