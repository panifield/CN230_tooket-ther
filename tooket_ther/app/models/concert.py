from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from tooket_ther.app.models.base import Base
from tooket_ther.app.models.enums import ConcertStatus, SeatStatus, ZoneStatus


class Organizer(Base):
    __tablename__ = "organizers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    concerts: Mapped[list[Concert]] = relationship(back_populates="organizer")


class Concert(Base):
    __tablename__ = "concerts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organizer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizers.id", ondelete="RESTRICT"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    venue: Mapped[str] = mapped_column(String(500), nullable=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sales_starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    # ISO 3166-1 alpha-2 host country (MVP: local priority if user.province set for TH concerts).
    host_country_code: Mapped[str] = mapped_column(String(2), nullable=False, server_default="TH")
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default=ConcertStatus.DRAFT.value
    )

    organizer: Mapped[Organizer] = relationship(back_populates="concerts")
    zones: Mapped[list[Zone]] = relationship(
        back_populates="concert", cascade="all, delete-orphan"
    )
    queue_entries: Mapped[list["QueueEntry"]] = relationship(back_populates="concert")


class Zone(Base):
    __tablename__ = "zones"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    concert_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("concerts.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    total_seats: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default=ZoneStatus.OPEN.value
    )
    min_sales_threshold: Mapped[int | None] = mapped_column(Integer, nullable=True)

    concert: Mapped[Concert] = relationship(back_populates="zones")
    seats: Mapped[list[Seat]] = relationship(back_populates="zone", cascade="all, delete-orphan")
    closure_events: Mapped[list["ZoneClosureEvent"]] = relationship(back_populates="zone")


class Seat(Base):
    __tablename__ = "seats"
    __table_args__ = (
        Index("ix_seats_zone_id_status", "zone_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    zone_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("zones.id", ondelete="CASCADE"), nullable=False
    )
    row_label: Mapped[str] = mapped_column(String(32), nullable=False)
    seat_no: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default=SeatStatus.AVAILABLE.value
    )
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")

    zone: Mapped[Zone] = relationship(back_populates="seats")
    bookings: Mapped[list["Booking"]] = relationship(back_populates="seat")
