import uuid
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import models
from tooket_ther.app.config import settings
from tooket_ther.app.models.concert import Organizer, Concert, Zone, Seat
from tooket_ther.app.models.user import User
from tooket_ther.app.models.booking import Booking, Payment, RefundRequest
from tooket_ther.app.models.ledger import OrganizerLedgerEntry
from tooket_ther.app.models.enums import (
    ConcertStatus, ZoneStatus, SeatStatus, BookingStatus, 
    PaymentStatus, PaymentMethod, LedgerEntryType, RefundRequestStatus
)

# Use existing DB URL from settings
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed():
    db = SessionLocal()
    try:
        print("🌱 Starting seed process...")

        # 1. Create Organizer
        org_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
        org = db.query(Organizer).filter(Organizer.id == org_id).first()
        if not org:
            org = Organizer(id=org_id, name="Tooket Entertainment")
            db.add(org)
            db.flush()
        
        # 2. Create Concert
        concert_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
        concert = db.query(Concert).filter(Concert.id == concert_id).first()
        if not concert:
            concert = Concert(
                id=concert_id,
                organizer_id=org.id,
                title="The World Tour 2026",
                venue="Tooket Arena, Bangkok",
                starts_at=datetime.now() + timedelta(days=30),
                sales_starts_at=datetime.now() - timedelta(days=5),
                status=ConcertStatus.PUBLISHED.value,
                host_country_code="TH",
                poster_url="https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=1000&auto=format&fit=crop",
                lineup="Artist A, Artist B, Artist C"
            )
            db.add(concert)
            db.flush()

        # 3. Create Zones
        zones_data = [
            {"id": uuid.uuid4(), "name": "VIP", "price": 5000.0, "total": 20},
            {"id": uuid.uuid4(), "name": "Standard", "price": 2500.0, "total": 50},
            {"id": uuid.uuid4(), "name": "Standing", "price": 1200.0, "total": 100},
        ]
        
        for z_info in zones_data:
            zone = db.query(Zone).filter(Zone.concert_id == concert_id, Zone.name == z_info["name"]).first()
            if not zone:
                zone = Zone(
                    id=z_info["id"],
                    concert_id=concert_id,
                    name=z_info["name"],
                    price=z_info["price"],
                    total_seats=z_info["total"],
                    status=ZoneStatus.OPEN.value
                )
                db.add(zone)
                db.flush()
                
                # 4. Create Seats for each zone
                for i in range(z_info["total"]):
                    row = chr(65 + (i // 10)) # A, B, C...
                    num = (i % 10) + 1
                    seat = Seat(
                        zone_id=zone.id,
                        row_label=row,
                        seat_no=str(num),
                        status=SeatStatus.AVAILABLE.value
                    )
                    db.add(seat)
            db.flush()

        # 5. Create Sample User
        user_id = uuid.UUID("22222222-2222-2222-2222-222222222222")
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            user = User(
                id=user_id,
                display_name="Sample Customer",
                email="customer@example.com",
                province="Bangkok"
            )
            db.add(user)
            db.flush()

        # 6. Create some Bookings for Dashboard to look populated
        # Get some seats to book
        available_seats = db.query(Seat).join(Zone).filter(Zone.concert_id == concert_id).limit(10).all()
        
        for idx, seat in enumerate(available_seats):
            # Status: 0-4 Paid, 5-7 Pending, 8 Refunded, 9 Cancelled
            if idx < 5:
                status = BookingStatus.PAID.value
                seat.status = SeatStatus.SOLD.value
            elif idx < 8:
                status = BookingStatus.PENDING_PAYMENT.value
                seat.status = SeatStatus.LOCKED.value
                seat.locked_until = datetime.now() + timedelta(minutes=15)
            elif idx == 8:
                status = BookingStatus.REFUNDED.value
                seat.status = SeatStatus.AVAILABLE.value
            else:
                status = BookingStatus.CANCELLED.value
                seat.status = SeatStatus.AVAILABLE.value
            
            booking = Booking(
                user_id=user.id,
                concert_id=concert_id,
                seat_id=seat.id,
                status=status,
                holder_name=f"Fan #{idx+1}"
            )
            db.add(booking)
            db.flush()
            
            if status == BookingStatus.PAID.value:
                payment = Payment(
                    booking_id=booking.id,
                    amount=float(seat.zone.price),
                    method=PaymentMethod.QR.value,
                    status=PaymentStatus.SUCCEEDED.value,
                    external_ref=f"REF-{uuid.uuid4().hex[:8]}"
                )
                db.add(payment)
                # Revenue ledger
                ledger = OrganizerLedgerEntry(
                    concert_id=concert_id,
                    entry_type=LedgerEntryType.REVENUE.value,
                    amount=float(seat.zone.price),
                    description=f"Ticket Sale - {seat.zone.name} {seat.row_label}{seat.seat_no}"
                )
                db.add(ledger)
            
            if status == BookingStatus.REFUNDED.value:
                refund = RefundRequest(
                    booking_id=booking.id,
                    bank_account_encrypted="EncryptedAccountData",
                    status=RefundRequestStatus.APPROVED.value
                )
                db.add(refund)

        # 7. Add some fixed expenses for the dashboard
        expenses = [
            {"amount": 15000.0, "desc": "Venue Rental"},
            {"amount": 5000.0, "desc": "Marketing & Ads"},
            {"amount": 2000.0, "desc": "Staffing"},
        ]
        for exp in expenses:
            db.add(OrganizerLedgerEntry(
                concert_id=concert_id,
                entry_type=LedgerEntryType.EXPENSE.value,
                amount=exp["amount"],
                description=exp["desc"]
            ))

        db.commit()
        print(f"✅ Seeding completed! Concert ID: {concert_id}")
        print(f"🔗 View Dashboard: http://localhost:3000/organizer/{concert_id}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
