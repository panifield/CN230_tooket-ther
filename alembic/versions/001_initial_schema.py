"""initial schema for concert ticketing

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-04-08 15:45:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("oauth_provider", sa.String(length=30), nullable=True),
        sa.Column("oauth_subject", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("role IN ('customer','organizer','checker','admin')", name="ck_users_role"),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "concerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organizer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("venue_name", sa.String(length=200), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sales_start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sales_end_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("host_country_code", sa.String(length=2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("status IN ('draft','on_sale','sold_out','closed')", name="ck_concerts_status"),
        sa.ForeignKeyConstraint(["organizer_id"], ["users.id"], name="fk_concerts_organizer_id_users", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "zones",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("concert_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("price_cents", sa.Integer(), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column("is_open", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.CheckConstraint("price_cents > 0", name="ck_zones_price_positive"),
        sa.CheckConstraint("capacity >= 0", name="ck_zones_capacity_non_negative"),
        sa.ForeignKeyConstraint(["concert_id"], ["concerts.id"], name="fk_zones_concert_id_concerts", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("concert_id", "name", name="uq_zones_concert_name"),
    )

    op.create_table(
        "seats",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("concert_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("zone_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("seat_label", sa.String(length=40), nullable=False),
        sa.Column("is_accessible", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.ForeignKeyConstraint(["concert_id"], ["concerts.id"], name="fk_seats_concert_id_concerts", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["zone_id"], ["zones.id"], name="fk_seats_zone_id_zones", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("concert_id", "seat_label", name="uq_seats_concert_seat_label"),
    )

    op.create_table(
        "queue_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("concert_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("queue_no", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("admitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("status IN ('waiting','admitted','expired','cancelled')", name="ck_queue_entries_status"),
        sa.ForeignKeyConstraint(["concert_id"], ["concerts.id"], name="fk_queue_entries_concert_id_concerts", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_queue_entries_user_id_users", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("concert_id", "queue_no", name="uq_queue_entries_concert_queue_no"),
        sa.UniqueConstraint("concert_id", "user_id", name="uq_queue_entries_concert_user"),
    )

    op.create_table(
        "bookings",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("concert_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("total_amount_cents", sa.Integer(), nullable=False),
        sa.Column("hold_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("status IN ('pending_payment','paid','cancelled','expired','refunded')", name="ck_bookings_status"),
        sa.CheckConstraint("total_amount_cents >= 0", name="ck_bookings_total_non_negative"),
        sa.ForeignKeyConstraint(["concert_id"], ["concerts.id"], name="fk_bookings_concert_id_concerts", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_bookings_user_id_users", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "booking_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("booking_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("seat_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("price_cents", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.CheckConstraint("price_cents > 0", name="ck_booking_items_price_positive"),
        sa.CheckConstraint("status IN ('held','confirmed','released','refunded')", name="ck_booking_items_status"),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], name="fk_booking_items_booking_id_bookings", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["seat_id"], ["seats.id"], name="fk_booking_items_seat_id_seats", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("seat_id", name="uq_booking_items_seat"),
    )

    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("booking_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider", sa.String(length=40), nullable=False),
        sa.Column("provider_txn_id", sa.String(length=120), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("amount_cents > 0", name="ck_payments_amount_positive"),
        sa.CheckConstraint("status IN ('pending','success','failed','cancelled')", name="ck_payments_status"),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], name="fk_payments_booking_id_bookings", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider_txn_id", name="uq_payments_provider_txn_id"),
    )

    op.create_table(
        "tickets",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("booking_item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ticket_code", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("status IN ('valid','used','void','refunded')", name="ck_tickets_status"),
        sa.ForeignKeyConstraint(["booking_item_id"], ["booking_items.id"], name="fk_tickets_booking_item_id_booking_items", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("booking_item_id", name="uq_tickets_booking_item_id"),
        sa.UniqueConstraint("ticket_code", name="uq_tickets_ticket_code"),
    )

    op.create_table(
        "checkins",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("ticket_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("checker_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("checked_in_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["checker_user_id"], ["users.id"], name="fk_checkins_checker_user_id_users", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["ticket_id"], ["tickets.id"], name="fk_checkins_ticket_id_tickets", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "refunds",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("booking_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requested_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("approved_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("requested_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("amount_cents > 0", name="ck_refunds_amount_positive"),
        sa.CheckConstraint("status IN ('requested','approved','rejected','completed')", name="ck_refunds_status"),
        sa.ForeignKeyConstraint(["approved_by"], ["users.id"], name="fk_refunds_approved_by_users", ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], name="fk_refunds_booking_id_bookings", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["requested_by"], ["users.id"], name="fk_refunds_requested_by_users", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index("ix_bookings_concert_id", "bookings", ["concert_id"])
    op.create_index("ix_bookings_user_id", "bookings", ["user_id"])
    op.create_index("ix_bookings_status", "bookings", ["status"])
    op.create_index("ix_queue_entries_status", "queue_entries", ["status"])
    op.create_index("ix_payments_booking_id", "payments", ["booking_id"])
    op.create_index("ix_tickets_ticket_code", "tickets", ["ticket_code"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_tickets_ticket_code", table_name="tickets")
    op.drop_index("ix_payments_booking_id", table_name="payments")
    op.drop_index("ix_queue_entries_status", table_name="queue_entries")
    op.drop_index("ix_bookings_status", table_name="bookings")
    op.drop_index("ix_bookings_user_id", table_name="bookings")
    op.drop_index("ix_bookings_concert_id", table_name="bookings")

    op.drop_table("refunds")
    op.drop_table("checkins")
    op.drop_table("tickets")
    op.drop_table("payments")
    op.drop_table("booking_items")
    op.drop_table("bookings")
    op.drop_table("queue_entries")
    op.drop_table("seats")
    op.drop_table("zones")
    op.drop_table("concerts")
    op.drop_table("users")
