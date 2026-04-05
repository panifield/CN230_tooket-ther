import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select

from tooket_ther.app.models.booking import Booking
from tooket_ther.app.models.concert import Seat
from tooket_ther.app.models.enums import BookingStatus
from tooket_ther.app.core.jwt_tokens import decode_token, TOKEN_TYPE_TICKET
from tooket_ther.app.schemas.checker import TicketCheckinResponse

class CheckinService:
    def __init__(self, db: Session):
        self.db = db

    def verify_and_checkin(self, token: str) -> TicketCheckinResponse:
        """
        T5.2 CheckinService.verify_and_checkin
        """
        try:
            payload = decode_token(token)
        except Exception:
            raise ValueError("Invalid or expired ticket token")

        if payload.get("type") != TOKEN_TYPE_TICKET:
            raise ValueError("Provided token is not a ticket")

        booking_id = uuid.UUID(payload["booking_id"])

        with self.db.begin_nested():
            booking = self.db.execute(
                select(Booking).where(Booking.id == booking_id).with_for_update()
            ).scalar_one_or_none()

            if not booking:
                raise ValueError("Booking not found")

            if booking.status != BookingStatus.PAID.value:
                raise ValueError(f"Ticket booking status is {booking.status}, cannot check-in")

            if booking.check_in_at is not None:
                raise ValueError("Ticket has already been used")

            # Check seat existence for response convenience
            seat = self.db.execute(
                select(Seat).where(Seat.id == booking.seat_id)
            ).scalar_one()

            # Perform check in
            booking.check_in_at = datetime.now(timezone.utc)
            self.db.flush()

        self.db.commit()

        return TicketCheckinResponse(
            success=True,
            message="Check-in successful",
            booking_id=str(booking.id),
            seat_label=f"{seat.row_label}{seat.seat_no}"
        )
