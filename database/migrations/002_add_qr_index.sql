-- ============================================================
-- Migration 002 — Add index on ticket.qr_hash
-- ============================================================
-- Reason: gate-entry QR verification (routes/staff.py) lookups by
-- qr_hash were sequential-scanning the entire ticket table on every
-- scan. This index makes verification O(log n).
--
-- Apply with:
--   psql $DATABASE_URL -f database/migrations/002_add_qr_index.sql
-- ============================================================

BEGIN;

CREATE INDEX IF NOT EXISTS idx_ticket_qr_hash ON ticket(qr_hash);

COMMIT;
