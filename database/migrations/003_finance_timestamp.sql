-- ============================================================
-- Migration 003 — Add finance.created_at + supporting index
-- ============================================================
-- Reason: the organizer dashboard (routes/organizer.py) currently
-- reconstructs the income/expense timeline by joining payment +
-- refund + booking, because finance had no timestamp. Adding
-- created_at lets the dashboard read directly from the ledger as a
-- single source of truth.
--
-- Existing rows get the migration's NOW() as their created_at —
-- they are coursework seed data and accurate-to-the-day timestamps
-- are not required.
--
-- Apply with:
--   psql $DATABASE_URL -f database/migrations/003_finance_timestamp.sql
-- ============================================================

BEGIN;

ALTER TABLE finance
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_finance_concert_created_at
    ON finance(concert_id, created_at);

COMMIT;
