from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import psycopg


def run_seed() -> None:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is required")

    now = datetime.now(tz=timezone.utc)
    starts_at = now + timedelta(days=30)
    sales_start = now - timedelta(days=1)
    sales_end = now + timedelta(days=20)

    with psycopg.connect(database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (email, display_name, role, oauth_provider, oauth_subject)
                VALUES
                    (%s, %s, %s, %s, %s),
                    (%s, %s, %s, %s, %s),
                    (%s, %s, %s, %s, %s)
                ON CONFLICT (email) DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                    role = EXCLUDED.role
                RETURNING id, email;
                """,
                (
                    "organizer@tooket.dev",
                    "Organizer One",
                    "organizer",
                    "line",
                    "org-001",
                    "checker@tooket.dev",
                    "Checker One",
                    "checker",
                    "line",
                    "chk-001",
                    "customer@tooket.dev",
                    "Customer One",
                    "customer",
                    "facebook",
                    "cus-001",
                ),
            )
            user_rows = cur.fetchall()
            user_ids = {email: user_id for user_id, email in user_rows}

            cur.execute(
                """
                INSERT INTO concerts
                    (organizer_id, title, venue_name, starts_at, sales_start_at, sales_end_at, status, host_country_code)
                VALUES
                    (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
                RETURNING id;
                """,
                (
                    user_ids["organizer@tooket.dev"],
                    "CN230 Live in Bangkok",
                    "Impact Arena",
                    starts_at,
                    sales_start,
                    sales_end,
                    "on_sale",
                    "TH",
                ),
            )
            row = cur.fetchone()
            if row is None:
                cur.execute(
                    "SELECT id FROM concerts WHERE title = %s ORDER BY created_at DESC LIMIT 1;",
                    ("CN230 Live in Bangkok",),
                )
                row = cur.fetchone()
            concert_id = row[0]

            cur.execute(
                """
                INSERT INTO zones (concert_id, name, price_cents, capacity, is_open)
                VALUES
                    (%s, 'VIP', 350000, 2, true),
                    (%s, 'REGULAR', 180000, 2, true)
                ON CONFLICT (concert_id, name)
                DO UPDATE SET
                    price_cents = EXCLUDED.price_cents,
                    capacity = EXCLUDED.capacity,
                    is_open = EXCLUDED.is_open
                RETURNING id, name;
                """,
                (concert_id, concert_id),
            )
            zone_rows = cur.fetchall()
            zone_ids = {name: zone_id for zone_id, name in zone_rows}

            cur.execute(
                """
                INSERT INTO seats (concert_id, zone_id, seat_label, is_accessible)
                VALUES
                    (%s, %s, 'A1', false),
                    (%s, %s, 'A2', false),
                    (%s, %s, 'B1', true),
                    (%s, %s, 'B2', false)
                ON CONFLICT (concert_id, seat_label)
                DO UPDATE SET
                    zone_id = EXCLUDED.zone_id,
                    is_accessible = EXCLUDED.is_accessible;
                """,
                (
                    concert_id,
                    zone_ids["VIP"],
                    concert_id,
                    zone_ids["VIP"],
                    concert_id,
                    zone_ids["REGULAR"],
                    concert_id,
                    zone_ids["REGULAR"],
                ),
            )

            cur.execute(
                """
                INSERT INTO queue_entries (concert_id, user_id, queue_no, status)
                VALUES (%s, %s, 1, 'admitted')
                ON CONFLICT (concert_id, user_id)
                DO UPDATE SET
                    queue_no = EXCLUDED.queue_no,
                    status = EXCLUDED.status,
                    admitted_at = now();
                """,
                (concert_id, user_ids["customer@tooket.dev"]),
            )

        conn.commit()


if __name__ == "__main__":
    run_seed()
    print("Seed completed.")
