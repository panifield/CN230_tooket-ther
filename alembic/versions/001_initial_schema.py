"""Initial schema: core entities from design_plan.

Revision ID: 001_initial
Revises:
Create Date: 2026-04-05

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "001_initial"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "organizers",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("address_line", sa.Text(), nullable=True),
        sa.Column("subdistrict", sa.String(length=120), nullable=True),
        sa.Column("district", sa.String(length=120), nullable=True),
        sa.Column("province", sa.String(length=120), nullable=True),
        sa.Column("postal_code", sa.String(length=20), nullable=True),
        sa.Column("priority_tier", sa.SmallInteger(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "concerts",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("organizer_id", UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("venue", sa.String(length=500), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sales_starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=32), server_default="draft", nullable=False),
        sa.ForeignKeyConstraint(["organizer_id"], ["organizers.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "user_identities",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("provider_subject", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider", "provider_subject", name="uq_user_identity_provider_subject"),
    )
    op.create_table(
        "organizer_ledger_entries",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("concert_id", UUID(as_uuid=True), nullable=False),
        sa.Column("entry_type", sa.String(length=32), server_default="revenue", nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["concert_id"], ["concerts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "queue_entries",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("concert_id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("priority_score", sa.Integer(), server_default="0", nullable=False),
        sa.Column("entered_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("status", sa.String(length=32), server_default="waiting", nullable=False),
        sa.Column("admitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("session_id", sa.String(length=64), nullable=True),
        sa.ForeignKeyConstraint(["concert_id"], ["concerts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "zones",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("concert_id", UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("price", sa.Numeric(12, 2), nullable=False),
        sa.Column("total_seats", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), server_default="open", nullable=False),
        sa.Column("min_sales_threshold", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["concert_id"], ["concerts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "seats",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("zone_id", UUID(as_uuid=True), nullable=False),
        sa.Column("row_label", sa.String(length=32), nullable=False),
        sa.Column("seat_no", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), server_default="available", nullable=False),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("version", sa.Integer(), server_default="0", nullable=False),
        sa.ForeignKeyConstraint(["zone_id"], ["zones.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "zone_closure_events",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("zone_id", UUID(as_uuid=True), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("moved_booking_count", sa.Integer(), server_default="0", nullable=False),
        sa.ForeignKeyConstraint(["zone_id"], ["zones.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "bookings",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("concert_id", UUID(as_uuid=True), nullable=False),
        sa.Column("seat_id", UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=32), server_default="pending_payment", nullable=False),
        sa.Column("holder_name", sa.String(length=255), nullable=True),
        sa.Column("delivery_method", sa.String(length=32), nullable=True),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("check_in_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["concert_id"], ["concerts.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["seat_id"], ["seats.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "payments",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("booking_id", UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("method", sa.String(length=32), server_default="qr", nullable=False),
        sa.Column("external_ref", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=32), server_default="pending", nullable=False),
        sa.Column("raw_webhook", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("external_ref"),
    )
    op.create_table(
        "refund_requests",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("booking_id", UUID(as_uuid=True), nullable=False),
        sa.Column("bank_account_encrypted", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), server_default="pending", nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index("ix_seats_zone_id_status", "seats", ["zone_id", "status"], unique=False)
    op.create_index(
        "ix_bookings_user_id_created_at",
        "bookings",
        ["user_id", "created_at"],
        unique=False,
        postgresql_ops={"created_at": "DESC"},
    )
    op.create_index(
        "ix_queue_entries_concert_dequeue",
        "queue_entries",
        ["concert_id", "status", "priority_score", "entered_at"],
        unique=False,
        postgresql_ops={"priority_score": "DESC"},
    )
    op.create_index(
        "uq_bookings_seat_active",
        "bookings",
        ["seat_id"],
        unique=True,
        postgresql_where=sa.text("status IN ('pending_payment', 'paid')"),
    )


def downgrade() -> None:
    op.drop_index("uq_bookings_seat_active", table_name="bookings")
    op.drop_index("ix_queue_entries_concert_dequeue", table_name="queue_entries")
    op.drop_index("ix_bookings_user_id_created_at", table_name="bookings")
    op.drop_index("ix_seats_zone_id_status", table_name="seats")

    op.drop_table("refund_requests")
    op.drop_table("payments")
    op.drop_table("bookings")
    op.drop_table("zone_closure_events")
    op.drop_table("seats")
    op.drop_table("zones")
    op.drop_table("queue_entries")
    op.drop_table("organizer_ledger_entries")
    op.drop_table("user_identities")
    op.drop_table("concerts")
    op.drop_table("users")
    op.drop_table("organizers")
