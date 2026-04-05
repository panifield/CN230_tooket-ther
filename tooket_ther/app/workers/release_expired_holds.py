import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from tooket_ther.app.database import SessionLocal
from tooket_ther.app.models.booking import Booking
from tooket_ther.app.models.concert import Seat
from tooket_ther.app.models.enums import BookingStatus, SeatStatus

logger = logging.getLogger(__name__)


def release_expired_holds(db: Session) -> int:
    """
    Find expired bookings in pending_payment status, 
    cancel them, and release the associated seats.
    """
    now = datetime.now(timezone.utc)

    # 1. Select expired pending bookings with FOR UPDATE
    stmt = (
        select(Booking)
        .where(
            Booking.status == BookingStatus.PENDING_PAYMENT.value,
            Booking.locked_until < now,
        )
        .with_for_update()
    )

    expired_bookings = db.scalars(stmt).all()
    if not expired_bookings:
        return 0

    released_count = 0
    for booking in expired_bookings:
        # Update booking
        booking.status = BookingStatus.CANCELLED.value

        # Select and update seat
        seat = db.get(Seat, booking.seat_id, with_for_update=True)
        if seat and seat.status == SeatStatus.LOCKED.value:
            seat.status = SeatStatus.AVAILABLE.value
            seat.locked_until = None

        released_count += 1

    db.commit()
    logger.info(f"Released {released_count} expired holds.")
    return released_count


def run_worker() -> None:
    db = SessionLocal()
    try:
        release_expired_holds(db)
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_worker()
