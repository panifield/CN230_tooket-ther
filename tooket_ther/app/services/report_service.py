import uuid
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from tooket_ther.app.models.booking import Payment
from tooket_ther.app.models.ledger import OrganizerLedgerEntry
from tooket_ther.app.models.concert import Zone, Seat
from tooket_ther.app.models.enums import PaymentStatus, LedgerEntryType, SeatStatus
from tooket_ther.app.schemas.reports import FinancialSummaryResponse, ZoneStatsResponse, ZoneStat

class ReportService:
    def __init__(self, db: Session):
        self.db = db

    def get_concert_financial_summary(self, concert_id: uuid.UUID) -> FinancialSummaryResponse:
        """T5.3 Organizer dashboard: aggregate revenues & expenses"""
        
        # In a generic design we might join Payments to Booking to Concert to filter.
        # But if we don't have direct concert_id on Payment, we join via Booking.
        from tooket_ther.app.models.booking import Booking
        
        # Aggregate Payments 
        rev_payment_query = select(func.sum(Payment.amount)).select_from(Payment).join(Booking).where(
            Booking.concert_id == concert_id,
            Payment.status == PaymentStatus.SUCCEEDED.value
        )
        total_payment_revenue = self.db.execute(rev_payment_query).scalar() or 0.0

        # Aggregate explicit Ledger Revenues
        rev_ledger_query = select(func.sum(OrganizerLedgerEntry.amount)).where(
            OrganizerLedgerEntry.concert_id == concert_id,
            OrganizerLedgerEntry.entry_type == LedgerEntryType.REVENUE.value
        )
        total_ledger_revenue = self.db.execute(rev_ledger_query).scalar() or 0.0

        # Aggregate explicit Ledger Expenses
        exp_ledger_query = select(func.sum(OrganizerLedgerEntry.amount)).where(
            OrganizerLedgerEntry.concert_id == concert_id,
            OrganizerLedgerEntry.entry_type == LedgerEntryType.EXPENSE.value
        )
        total_ledger_expense = self.db.execute(exp_ledger_query).scalar() or 0.0

        total_revenues = float(total_payment_revenue) + float(total_ledger_revenue)
        total_expenses = float(total_ledger_expense)

        return FinancialSummaryResponse(
            concert_id=str(concert_id),
            total_revenues=total_revenues,
            total_expenses=total_expenses,
            net_profit=total_revenues - total_expenses
        )

    def get_zone_booking_stats(self, concert_id: uuid.UUID) -> ZoneStatsResponse:
        """T5.4 Reports on bookings per zone"""
        zones = self.db.execute(
            select(Zone).where(Zone.concert_id == concert_id)
        ).scalars().all()

        zone_stats = []
        for zone in zones:
            sold_count_query = select(func.count(Seat.id)).where(
                Seat.zone_id == zone.id,
                Seat.status == SeatStatus.SOLD.value
            )
            sold_count = self.db.execute(sold_count_query).scalar() or 0
            
            # Use zone.total_seats or a count of all seats assigned to zone
            total_seats = zone.total_seats
            occupancy = (sold_count / total_seats) if total_seats > 0 else 0.0
            
            zone_stats.append(ZoneStat(
                zone_id=str(zone.id),
                zone_name=zone.name,
                total_seats=total_seats,
                sold_seats=sold_count,
                occupancy_rate=occupancy
            ))

        return ZoneStatsResponse(concert_id=str(concert_id), zones=zone_stats)
