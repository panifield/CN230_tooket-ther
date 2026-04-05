from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from tooket_ther.app.models.base import Base
from tooket_ther.app.models.enums import (
    BookingStatus,
    PaymentMethod,
    PaymentStatus,
    RefundRequestStatus,
)


class Booking(Base):
    __tablename__ = "bookings"
    __table_args__ = (
        Index(
            "ix_bookings_user_id_created_at",
            "user_id",
            "created_at",
            postgresql_ops={"created_at": "DESC"},
        ),
        Index(
            "uq_bookings_seat_active",
            "seat_id",
            unique=True,
            postgresql_where=text("status IN ('pending_payment', 'paid')"),
        ),
    )


    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    concert_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("concerts.id", ondelete="RESTRICT"), nullable=False
    )
    seat_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("seats.id", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default=BookingStatus.PENDING_PAYMENT.value
    )
    holder_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    delivery_method: Mapped[str | None] = mapped_column(String(32), nullable=True)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    check_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="bookings")
    concert: Mapped["Concert"] = relationship()
    seat: Mapped["Seat"] = relationship(back_populates="bookings")
    payments: Mapped[list[Payment]] = relationship(
        back_populates="booking", cascade="all, delete-orphan"
    )
    refund_requests: Mapped[list[RefundRequest]] = relationship(
        back_populates="booking", cascade="all, delete-orphan"
    )


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    booking_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    method: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default=PaymentMethod.QR.value
    )
    external_ref: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default=PaymentStatus.PENDING.value
    )
    raw_webhook: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    booking: Mapped[Booking] = relationship(back_populates="payments")


class RefundRequest(Base):
    __tablename__ = "refund_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    booking_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False
    )
    bank_account_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default=RefundRequestStatus.PENDING.value
    )
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    booking: Mapped[Booking] = relationship(back_populates="refund_requests")
