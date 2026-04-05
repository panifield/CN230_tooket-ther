from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from tooket_ther.app.models.base import Base
from tooket_ther.app.models.enums import LedgerEntryType


class OrganizerLedgerEntry(Base):
    """Revenue / expense lines for organizer dashboard (design_plan: organizer_ledger)."""

    __tablename__ = "organizer_ledger_entries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    concert_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("concerts.id", ondelete="CASCADE"), nullable=False
    )
    entry_type: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default=LedgerEntryType.REVENUE.value
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    concert: Mapped["Concert"] = relationship()


class ZoneClosureEvent(Base):
    __tablename__ = "zone_closure_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    zone_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("zones.id", ondelete="RESTRICT"), nullable=False
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    closed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    moved_booking_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")

    zone: Mapped["Zone"] = relationship(back_populates="closure_events")
