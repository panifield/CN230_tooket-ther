import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select

from tooket_ther.app.models.booking import Booking, RefundRequest, Payment
from tooket_ther.app.models.concert import Concert, Seat
from tooket_ther.app.models.enums import RefundRequestStatus, BookingStatus, SeatStatus
from tooket_ther.app.domain.refund_policy import can_request_refund
from tooket_ther.app.schemas.refund import RefundRequestCreate, RefundRequestResponse

class RefundService:
    def __init__(self, db: Session):
        self.db = db

    def request_refund(self, booking_id: uuid.UUID, user_id: uuid.UUID, req: RefundRequestCreate) -> RefundRequestResponse:
        """
        T4.2 Create user refund_request + store bank info.
        """
        now = datetime.now(timezone.utc)
        
        with self.db.begin_nested():
            booking = self.db.execute(
                select(Booking).where(Booking.id == booking_id).with_for_update()
            ).scalar_one_or_none()
            
            if not booking:
                raise ValueError("Booking not found")

            if booking.user_id != user_id:
                raise ValueError("Not authorized to refund this booking")

            concert = self.db.execute(
                select(Concert).where(Concert.id == booking.concert_id)
            ).scalar_one()

            if not can_request_refund(booking, concert, now):
                raise ValueError("Cannot request a refund for this booking at this time")
            
            existing_res = self.db.execute(
                select(RefundRequest).where(RefundRequest.booking_id == booking_id)
            )
            if existing_res.scalars().first():
                raise ValueError("Refund request already exists for this booking")

            refund_request = RefundRequest(
                booking_id=booking.id,
                bank_account_encrypted=req.bank_account_encrypted,
                status=RefundRequestStatus.PENDING.value
            )
            self.db.add(refund_request)
            self.db.flush()

        self.db.commit()
        self.db.refresh(refund_request)
        return RefundRequestResponse.model_validate(refund_request)

    def approve_refund(self, refund_id: uuid.UUID) -> None:
        """
        T4.3 API organizer: approve refund -> return seat + update booking
        """
        now = datetime.now(timezone.utc)
        
        with self.db.begin_nested():
            refund_req = self.db.execute(
                select(RefundRequest).where(RefundRequest.id == refund_id).with_for_update()
            ).scalar_one_or_none()
            
            if not refund_req:
                raise ValueError("Refund request not found")

            if refund_req.status != RefundRequestStatus.PENDING.value:
                raise ValueError("Refund request is not pending")

            refund_req.status = RefundRequestStatus.APPROVED.value
            refund_req.processed_at = now

            booking = self.db.execute(
                select(Booking).where(Booking.id == refund_req.booking_id).with_for_update()
            ).scalar_one()

            booking.status = BookingStatus.REFUNDED.value

            seat = self.db.execute(
                select(Seat).where(Seat.id == booking.seat_id).with_for_update()
            ).scalar_one()
            
            seat.status = SeatStatus.AVAILABLE.value
            seat.locked_until = None

            self.db.flush()
        
        self.db.commit()
