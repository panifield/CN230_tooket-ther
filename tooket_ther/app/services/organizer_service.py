import uuid
from sqlalchemy.orm import Session
from sqlalchemy import select

from tooket_ther.app.models.concert import Zone, Seat
from tooket_ther.app.models.booking import Booking
from tooket_ther.app.models.enums import ZoneStatus, BookingStatus, SeatStatus

class OrganizerService:
    def __init__(self, db: Session):
        self.db = db

    def close_zone(self, zone_id: uuid.UUID, reason: str = "Low sales"):
        """
        T4.4 Organizer close zone.
        Updates zone to closed.
        """
        with self.db.begin_nested():
            zone = self.db.execute(
                select(Zone).where(Zone.id == zone_id).with_for_update()
            ).scalar_one_or_none()
            
            if not zone:
                raise ValueError("Zone not found")

            zone.status = ZoneStatus.CLOSED.value
            self.db.flush()
        self.db.commit()

    def move_booking_to_zone(self, booking_id: uuid.UUID, target_zone_id: uuid.UUID):
        """
        T4.5 Move seating flow (Free upgrade)
        """
        with self.db.begin_nested():
            booking = self.db.execute(
                select(Booking).where(Booking.id == booking_id).with_for_update()
            ).scalar_one_or_none()
            
            if not booking:
                raise ValueError("Booking not found")

            if booking.status not in [BookingStatus.PAID.value]:
                raise ValueError("Only PAID bookings can be auto-upgraded")

            old_seat = self.db.execute(
                select(Seat).where(Seat.id == booking.seat_id).with_for_update()
            ).scalar_one()
            
            old_seat.status = SeatStatus.AVAILABLE.value

            new_seat = self.db.execute(
                select(Seat)
                .where(Seat.zone_id == target_zone_id)
                .where(Seat.status == SeatStatus.AVAILABLE.value)
                .limit(1)
                .with_for_update(skip_locked=True)
            ).scalar_one_or_none()
            
            if not new_seat:
                raise ValueError("No available seats in target zone to upgrade to")

            new_seat.status = SeatStatus.SOLD.value
            booking.seat_id = new_seat.id

            self.db.flush()

        self.db.commit()
