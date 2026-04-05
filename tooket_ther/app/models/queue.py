from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from tooket_ther.app.models.base import Base
from tooket_ther.app.models.enums import QueueEntryStatus


class QueueEntry(Base):
    __tablename__ = "queue_entries"
    __table_args__ = (
        Index(
            "ix_queue_entries_concert_dequeue",
            "concert_id",
            "status",
            "priority_score",
            "entered_at",
            postgresql_ops={"priority_score": "DESC"},
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    concert_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("concerts.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    priority_score: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    entered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default=QueueEntryStatus.WAITING.value
    )
    admitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    session_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    concert: Mapped["Concert"] = relationship(back_populates="queue_entries")
    user: Mapped["User"] = relationship(back_populates="queue_entries")
