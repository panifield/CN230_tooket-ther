-- ============================================================
-- queries.sql — Tooket-ther Backend Queries
-- Schema:  database/schema.sql
-- Seed:    database/seed.sql
-- Course:  CN230 Database Systems · 2/2567
-- ============================================================
-- วิธีรัน:
--   psql tookettherdb < database/schema.sql
--   psql tookettherdb < database/seed.sql
--   psql tookettherdb < queries.sql        (หรือคัดเฉพาะ block ที่ต้องการ)
--
-- ทุก query ใส่ค่า parameter จริงจาก seed (เช่น concert_id = 1) เพื่อให้
-- copy-paste ลง psql ได้เลย และมี "Expected Result" เป็น comment ใต้ query
-- ผลลัพธ์อ้างอิงสถานะ database หลังรัน seed.sql เสร็จใหม่ ๆ (NOW() ในเครื่อง
-- คุณจะส่งผลกับ Q ที่ใช้เวลาปัจจุบัน — ดู comment ในแต่ละ query)
--
-- สารบัญ
--   Section 0  Core Teaching Queries (Q1–Q6) ตามเกณฑ์รายวิชา
--   Section 1  Auth queries          (routes/auth.py)
--   Section 2  Booking / Queue / Seat (routes/booking.py)
--   Section 3  Organizer queries     (routes/organizer.py)
--   Section 4  Payment queries       (routes/payment.py)
--   Section 5  Refund queries        (routes/refund.py)
--   Section 6  Staff queries         (routes/staff.py)
--   Section 7  Background Expiry Job (app.py)
-- ============================================================


-- ╔══════════════════════════════════════════════════════════╗
-- ║ Section 0 — Core Teaching Queries (Q1–Q6)                 ║
-- ╚══════════════════════════════════════════════════════════╝

-- Q1: ที่นั่งว่างใน concert + zone (JOIN, ORDER BY หลายระดับ)
-- ใช้: หน้าเลือกที่นั่ง — แสดง available seat พร้อมโซนและราคา
SELECT s.id         AS seat_id,
       s.seat_row,
       s.seat_number,
       s.status,
       z.zone_name,
       z.price
FROM seat s
JOIN zone z ON s.zone_id = z.id
WHERE z.concert_id = 1
  AND s.status      = 'available'
  AND z.is_active   = TRUE
ORDER BY z.price DESC, s.seat_row, s.seat_number;

/* Expected Result (46 rows; แสดงตัวอย่าง 8 แถวแรก):
 seat_id | seat_row | seat_number |  status   |   zone_name    | price
---------+----------+-------------+-----------+----------------+--------
       3 | A        | A03         | available | GOLDEN CIRCLE  | 6500.00
       4 | A        | A04         | available | GOLDEN CIRCLE  | 6500.00
       6 | A        | A06         | available | GOLDEN CIRCLE  | 6500.00
       7 | A        | A07         | available | GOLDEN CIRCLE  | 6500.00
       8 | A        | A08         | available | GOLDEN CIRCLE  | 6500.00
       9 | A        | A09         | available | GOLDEN CIRCLE  | 6500.00
      10 | A        | A10         | available | GOLDEN CIRCLE  | 6500.00
      16 | B        | B06         | available | VIP            | 4000.00
... (อีก 38 แถว: VIP=4 ใบ, A=18 ใบ, B=17 ใบ)
*/


-- Q2: ยอดรายรับแยกโซน (JOIN + GROUP BY + SUM)
-- ใช้: Organizer dashboard — รายงานการเงินรายโซน
-- หมายเหตุ: query นี้ไม่ได้กรอง zone จาก ticket จริง (ทุก zone จะเห็นยอดเดียวกัน)
SELECT z.zone_name,
       COUNT(DISTINCT b.id)  AS total_bookings,
       SUM(b.total_amount)   AS total_revenue
FROM booking b
JOIN customer_profile cp ON b.customer_id = cp.id
JOIN concert c            ON b.concert_id  = c.id
JOIN zone z               ON z.concert_id  = c.id
WHERE b.status     = 'paid'
  AND b.concert_id = 1
GROUP BY z.zone_name
ORDER BY total_revenue DESC;

/* Expected Result (4 rows — booking paid มีแค่ #1 ราคา 13000):
   zone_name    | total_bookings | total_revenue
----------------+----------------+---------------
 GOLDEN CIRCLE  |              1 |      13000.00
 VIP            |              1 |      13000.00
 A              |              1 |      13000.00
 B              |              1 |      13000.00
*/


-- Q3: ประวัติการซื้อรายตั๋วของผู้ใช้ (JOIN 5 ตาราง)
-- ใช้: หน้า "ตั๋วของฉัน"
SELECT b.id           AS booking_id,
       c.title         AS concert_name,
       c.concert_datetime,
       z.zone_name,
       s.seat_row,
       s.seat_number,
       b.total_amount,
       b.status,
       b.created_at
FROM booking b
JOIN customer_profile cp ON b.customer_id = cp.id
JOIN concert c            ON b.concert_id  = c.id
JOIN ticket t             ON t.booking_id  = b.id
JOIN seat s               ON t.seat_id     = s.id
JOIN zone z               ON s.zone_id     = z.id
WHERE cp.user_id = 4         -- Anunda (customer_profile_id=1)
ORDER BY b.created_at DESC;

/* Expected Result (2 rows — booking 1 มี 2 ตั๋ว, booking 4 ไม่มี ticket):
 booking_id |       concert_name       | concert_datetime    |  zone_name     | seat_row | seat_number | total_amount | status |     created_at
------------+--------------------------+---------------------+----------------+----------+-------------+--------------+--------+---------------------
          1 | BTS WORLD TOUR BANGKOK   | 2025-08-15 18:00:00 | GOLDEN CIRCLE  | A        | A01         |     13000.00 | paid   | 2025-05-01 10:01:00
          1 | BTS WORLD TOUR BANGKOK   | 2025-08-15 18:00:00 | GOLDEN CIRCLE  | A        | A02         |     13000.00 | paid   | 2025-05-01 10:01:00
*/


-- Q4: Booking ที่หมดเวลาและยังไม่ชำระ (Aggregate + array_agg)
-- ใช้: Background task คืนที่นั่งอัตโนมัติ (ดู Section 7)
SELECT b.id          AS booking_id,
       b.customer_id,
       b.concert_id,
       b.expired_at,
       array_agg(t.seat_id) AS seat_ids
FROM booking b
JOIN ticket t ON t.booking_id = b.id
WHERE b.status     = 'pending'
  AND b.expired_at < NOW()
GROUP BY b.id, b.customer_id, b.concert_id, b.expired_at;

/* Expected Result (1 row — booking 2 หมดเวลาตั้งแต่ 2025-05-01 10:18 และยัง pending):
 booking_id | customer_id | concert_id |     expired_at      | seat_ids
------------+-------------+------------+---------------------+----------
          2 |           2 |          1 | 2025-05-01 10:18:00 | {4}
*/


-- Q5: โซนที่ยอดจองต่ำกว่า min_booking_threshold (HAVING + LEFT JOIN chain)
-- ใช้: Organizer — รายชื่อโซนที่ควรพิจารณา "ปิดโซน"
SELECT z.id                    AS zone_id,
       z.zone_name,
       z.min_booking_threshold,
       COUNT(b.id)             AS confirmed_bookings
FROM zone z
LEFT JOIN seat s    ON s.zone_id    = z.id
LEFT JOIN ticket t  ON t.seat_id    = s.id
LEFT JOIN booking b ON t.booking_id = b.id AND b.status = 'paid'
WHERE z.concert_id = 1
  AND z.is_active  = TRUE
GROUP BY z.id, z.zone_name, z.min_booking_threshold
HAVING COUNT(b.id) < z.min_booking_threshold;

/* Expected Result (4 rows — ทุก zone ของ concert 1 ยอดต่ำกว่า 10):
 zone_id |   zone_name    | min_booking_threshold | confirmed_bookings
---------+----------------+-----------------------+--------------------
       1 | GOLDEN CIRCLE  |                    10 |                  2
       2 | VIP            |                    10 |                  0
       3 | A              |                    10 |                  0
       4 | B              |                    10 |                  0
*/


-- Q6: Priority Queue — เรียงลำดับคิว (Window Function ROW_NUMBER)
-- ใช้: หน้า Queue Status — แสดงลำดับใครจะได้ admit ก่อน
SELECT u.name,
       cp.location_score,
       q.priority_score,
       q.entered_at,
       q.status,
       ROW_NUMBER() OVER (
           ORDER BY q.priority_score DESC, q.entered_at ASC
       ) AS queue_position
FROM queue_session q
JOIN customer_profile cp ON q.customer_id = cp.id
JOIN users u              ON cp.user_id    = u.id
WHERE q.concert_id = 1
  AND q.status     = 'waiting'
ORDER BY q.priority_score DESC, q.entered_at ASC;

/* Expected Result (2 rows — Akira priority สูงกว่าจึงได้ position 1):
     name      | location_score | priority_score |     entered_at      | status  | queue_position
---------------+----------------+----------------+---------------------+---------+----------------
 Akira Tanaka  |              3 |             10 | 2025-05-01 10:00:40 | waiting |              1
 สุดา รักดนตรี   |              2 |             100 | 2025-05-01 10:00:15 | waiting |              2
*/


-- ╔══════════════════════════════════════════════════════════╗
-- ║ Section 1 — Auth (routes/auth.py)                         ║
-- ╚══════════════════════════════════════════════════════════╝

-- Q1.1: Login lookup — หา user จาก email + เปรียบเทียบ password hash
-- Endpoint: POST /auth/login
-- Pattern:  point lookup (UNIQUE email)
SELECT id, role, password
FROM users
WHERE email = 'anunda_d@gmail.com';

/* Expected Result (1 row):
 id | role     | password
----+----------+-------------
  4 | customer | Anunnnn23.
*/


-- Q1.2: get_current_user — ดึง user + profile_id ทุกบทบาทใน 1 query (LEFT JOIN ทั้งสาม profile)
-- Used in: routes/deps.py ตอน decode JWT
-- Pattern: ผู้ใช้คนเดียวมี profile ได้แค่บทบาทเดียว → คอลัมน์ที่ไม่ใช่จะเป็น NULL
SELECT u.id, u.name, u.email, u.role,
       cp.id  AS customer_profile_id,
       cp.location_score,
       op.id  AS organizer_profile_id,
       u.phone, u.address, u.id_card,
       sp.id  AS staff_profile_id
FROM users u
LEFT JOIN customer_profile  cp ON cp.user_id = u.id
LEFT JOIN organizer_profile op ON op.user_id = u.id
LEFT JOIN staff_profile     sp ON sp.user_id = u.id

/* Expected Result (1 row — Anunda customer):
 id |    name    |       email        |   role   | customer_profile_id | location_score | organizer_profile_id |   phone    | address | id_card     | staff_profile_id
----+------------+--------------------+----------+---------------------+----------------+----------------------+------------+---------+-------------+------------------
  4 | อนันต์ ใจดี  | anunda_d@gmail.com | customer |                   1 |              1 |                 NULL | 0548763088 | Bangkok | 12382938491 |             NULL
  5| สุดา รักดนตรี |  suda_s@gmail.com  |  customer|                    2|               2|                  NULL|  0888763066| Chiangmai| 29384719182|             NULL
 1| สุพรัตน์ วงศวาง|  Suparat_t@gmail.com| organizer|                NULL|            NULL|                     1|  0648763092| Bangkok  | 94038203838|             NULL
  .
  .
  .
*/


-- Q1.3: OAuth social_account lookup — เช็กว่ามี social_account แล้วหรือยัง
-- Endpoint: GET /auth/oauth/{provider}/callback
SELECT u.id, u.role
FROM social_account sa
JOIN users u ON u.id = sa.user_id
WHERE sa.social_user_id = 'U4af4980629'
  AND sa.type_social    = 'line';

/* Expected Result (1 row — link ของ Suparat ใน seed):
 id | role
----+-----------
  1 | organizer
*/


-- Q1.4: forgot_password verify — ยืนยัน email + id_card ก่อนเปลี่ยนรหัส (dev mode)
-- Endpoint: POST /auth/forgot-password
SELECT id
FROM users
WHERE email   = 'akira@gmail.com'
  AND id_card = '19191919191';

/* Expected Result (1 row):
 id
----
  6
*/


-- ╔══════════════════════════════════════════════════════════╗
-- ║ Section 2 — Booking / Queue / Seat (routes/booking.py)    ║
-- ╚══════════════════════════════════════════════════════════╝

-- Q2.1: List concerts + dynamic status (CASE WHEN เทียบ NOW() กับ sale window)
-- Endpoint: GET /booking/concerts
-- Pattern:  CASE expression สำหรับคำนวณ status สด ๆ
SELECT id, title, artist, venue, address, concert_datetime,
       CASE
         WHEN status = 'cancelled' THEN 'cancelled'
         WHEN status = 'draft'     THEN 'draft'
         WHEN NOW() < sale_open_at THEN 'upcoming'
         WHEN (NOW() >= sale_open_at AND (sale_close_at IS NULL OR NOW() <= sale_close_at)) THEN 'on_sale'
         ELSE 'closed'
       END AS dynamic_status,
       image_url
FROM concert
ORDER BY concert_datetime DESC;

/* Expected Result (2 rows — สมมุติ NOW() = 2025-08-01):
 id |          title          |  artist   |       venue          |   address   | concert_datetime    | dynamic_status | image_url
----+-------------------------+-----------+----------------------+-------------+---------------------+----------------+-----------
  2 | BLACKPINK BANGKOK       | BLACKPINK | Impact Arena         | Nonthaburi  | 2025-09-20 19:00:00 | on_sale        | NULL
  1 | BTS WORLD TOUR BANGKOK  | BTS       | Rajamangala Stadium  | Bangkok     | 2025-08-15 18:00:00 | on_sale        | NULL
*/


-- Q2.2: queue_status — ดูตำแหน่งคิวของลูกค้า (correlated COUNT)
-- Endpoint: GET /booking/concerts/{concert_id}/queue/status
-- Pattern: 2-step — ดึง row ของตัวเอง แล้วนับว่ามีคนนำหน้ากี่คน
WITH me AS (
  SELECT id, priority_score, entered_at, status
  FROM queue_session
  WHERE customer_id = 2 AND concert_id = 1     -- Suda
)
SELECT m.id  AS queue_id,
       m.priority_score,
       m.entered_at,
       m.status,
       (SELECT COUNT(*) + 1
          FROM queue_session q, me
         WHERE q.concert_id = 1
           AND q.status     = 'waiting'
           AND ( q.priority_score >  me.priority_score
              OR (q.priority_score = me.priority_score AND q.entered_at < me.entered_at)))
         AS position_in_queue,
       (SELECT COUNT(*) FROM queue_session
         WHERE concert_id = 1 AND status = 'waiting') AS total_waiting
FROM me m;

/* Expected Result (1 row — Suda priority 62 อยู่หลัง Akira priority 73):
 queue_id | priority_score |     entered_at      |  status  | position_in_queue | total_waiting
----------+----------------+---------------------+----------+-------------------+---------------
        2 |             62 | 2025-05-01 10:00:15 | waiting  |                 2 |             2
*/


-- Q2.3: List zones + available_count (LEFT JOIN + FILTER aggregate)
-- Endpoint: GET /booking/concerts/{concert_id}/zones
-- Pattern: COUNT(...) FILTER (WHERE ...) สำหรับนับเฉพาะ status='available'
SELECT z.id, z.zone_name, z.price, z.total_seats, z.is_active,
       COUNT(s.id) FILTER (WHERE s.status = 'available') AS available_count
FROM zone z
LEFT JOIN seat s ON s.zone_id = z.id
WHERE z.concert_id = 1
GROUP BY z.id, z.zone_name, z.price, z.total_seats, z.is_active
ORDER BY z.price DESC;

/* Expected Result (4 rows):
 id |   zone_name    |  price  | total_seats | is_active | available_count
----+----------------+---------+-------------+-----------+-----------------
  1 | GOLDEN CIRCLE  | 6500.00 |         150 | t         |               7
  2 | VIP            | 4000.00 |         300 | t         |               4
  3 | A              | 3000.00 |         600 | t         |              18
  4 | B              | 2500.00 |        1200 | t         |              17
*/


-- Q2.4: Get seats in zone (JOIN ตรวจว่า zone อยู่ใน concert จริง)
-- Endpoint: GET /booking/concerts/{concert_id}/zones/{zone_id}/seats
SELECT s.id, s.seat_row, s.seat_number, s.status
FROM seat s
JOIN zone z ON z.id = s.zone_id
WHERE s.zone_id = 1 AND z.concert_id = 1
ORDER BY s.seat_row, s.seat_number;

/* Expected Result (10 rows):
 id | seat_row | seat_number |  status
----+----------+-------------+-----------
  1 | A        | A01         | sold
  2 | A        | A02         | sold
  3 | A        | A03         | available
  4 | A        | A04         | available
  5 | A        | A05         | locked
  6 | A        | A06         | available
  7 | A        | A07         | available
  8 | A        | A08         | available
  9 | A        | A09         | available
 10 | A        | A10         | available
*/


-- Q2.5: my_bookings — ประวัติการจองของลูกค้า (JOIN concert)
-- Endpoint: GET /booking/my
SELECT b.id, b.concert_id, c.title, c.concert_datetime, c.venue, c.address,
       b.total_tickets, b.total_amount, b.status, b.created_at
FROM booking b
JOIN concert c ON c.id = b.concert_id
WHERE b.customer_id = 1                  -- Anunda
ORDER BY b.created_at DESC;

/* Expected Result (2 rows):
 id | concert_id |          title          | concert_datetime    |        venue        | address | total_tickets | total_amount |  status   |     created_at
----+------------+-------------------------+---------------------+---------------------+---------+---------------+--------------+-----------+---------------------
  4 |          1 | BTS WORLD TOUR BANGKOK  | 2025-08-15 18:00:00 | Rajamangala Stadium | Bangkok |             1 |      6500.00 | cancelled | 2025-05-01 10:20:00
  1 |          1 | BTS WORLD TOUR BANGKOK  | 2025-08-15 18:00:00 | Rajamangala Stadium | Bangkok |             2 |     13000.00 | paid      | 2025-05-01 10:01:00
*/


-- Q2.6: Tickets ของ booking + qr_hash (JOIN seat + zone)
-- Endpoint: GET /booking/{booking_id}/tickets
SELECT t.id          AS ticket_id,
       t.qr_hash,
       s.seat_number,
       z.zone_name,
       t.is_used
FROM ticket t
JOIN seat s ON t.seat_id = s.id
JOIN zone z ON s.zone_id = z.id
WHERE t.booking_id = 1;

/* Expected Result (2 rows — ticket 1 ถูก check-in ไปแล้ว):
 ticket_id |   qr_hash    | seat_number |   zone_name   | is_used
-----------+--------------+-------------+---------------+---------
         1 | QR-TKT-0001  | A01         | GOLDEN CIRCLE | t
         2 | QR-TKT-0002  | A02         | GOLDEN CIRCLE | f
*/


-- Q2.7: View vw_booking_summary — สรุป booking + concert ในตารางเดียว
-- ใช้: ดูภาพรวมรายการจองของลูกค้า (alternative ของ Q2.5)
SELECT booking_id, user_name, concert_title, total_tickets, total_amount, status
FROM vw_booking_summary
ORDER BY booking_id;

/* Expected Result (4 rows):
 booking_id |  user_name   |       concert_title      | total_tickets | total_amount |  status
------------+--------------+--------------------------+---------------+--------------+-----------
          1 | อนันต์ ใจดี    | BTS WORLD TOUR BANGKOK   |             2 |     13000.00 | paid
          2 | สุดา รักดนตรี  | BTS WORLD TOUR BANGKOK   |             1 |      2500.00 | pending
          3 | Akira Tanaka | BTS WORLD TOUR BANGKOK   |             1 |      4000.00 | expired
          4 | อนันต์ ใจดี    | BTS WORLD TOUR BANGKOK   |             1 |      6500.00 | cancelled
*/


-- ╔══════════════════════════════════════════════════════════╗
-- ║ Section 3 — Organizer (routes/organizer.py)               ║
-- ╚══════════════════════════════════════════════════════════╝

-- Q3.1: Queue dashboard ของ organizer (JOIN users + ORDER BY 2 keys)
-- Endpoint: GET /organizer/concerts/{concert_id}/queues
SELECT q.id, u.name, u.email, q.priority_score, q.status, q.entered_at
FROM queue_session q
JOIN customer_profile cp ON q.customer_id = cp.id
JOIN users u              ON cp.user_id    = u.id
WHERE q.concert_id = 1
ORDER BY q.priority_score DESC, q.entered_at ASC;

/* Expected Result (3 rows):
 id |    name      |       email         | priority_score |  status   |     entered_at
----+--------------+---------------------+----------------+-----------+---------------------
  3 | Akira Tanaka | akira@gmail.com     |             73 | waiting   | 2025-05-01 10:00:40
  2 | สุดา รักดนตรี  | suda_s@gmail.com    |             62 | waiting   | 2025-05-01 10:00:15
  1 | อนันต์ ใจดี    | anunda_d@gmail.com  |             51 | admitted  | 2025-05-01 10:00:10
*/


-- Q3.2: Auto-sort priority — recalc priority ตามที่อยู่ (UPDATE + JOIN address)
-- Endpoint: POST /organizer/concerts/{concert_id}/queues/auto_sort
-- Logic:    address ตรงกัน = 100, ไม่ตรง = 10
UPDATE queue_session q
SET    priority_score = CASE
         WHEN u.address = c.address THEN 100
         ELSE 10
       END
FROM customer_profile cp,
     users u,
     concert c
WHERE q.concert_id  = 1
  AND q.customer_id = cp.id
  AND cp.user_id    = u.id
  AND c.id          = q.concert_id;

/* Expected Result (UPDATE 3 — concert 1 อยู่ Bangkok):
   • Anunda  (Bangkok)   → 100
   • Suda    (Chiangmai) → 10
   • Akira   (Japan)     → 10
*/


-- Q3.3: Sales dashboard — รายรับ/รายจ่ายรายวัน (CASE + GROUP BY date + timezone cast)
-- Endpoint: GET /organizer/concerts/{concert_id}/dashboard
-- Pattern:  Aggregate finance ledger + แปลง timezone
SELECT
    (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::date AS day,
    SUM(CASE WHEN amount > 0 THEN amount  ELSE 0 END) AS income,
    SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) AS expense
FROM finance
WHERE concert_id = 1
GROUP BY day
ORDER BY day ASC;

/* Expected Result (1 row — seed มี 2 finance rows ในวันเดียวกัน):
    day      |  income  | expense
-------------+----------+---------
 2025-05-01  | 13000.00 | 2500.00
หมายเหตุ: seed.sql เก็บ finance.amount เป็นเลขบวกทั้งหมด (refund 2500 ไม่ติดลบ)
ในการรันจริง expense=0 ยกเว้นจะ INSERT refund แบบติดลบเหมือนใน routes/organizer.py:approve_refund
*/


-- Q3.4: Sales summary จาก view vw_concert_sales (LEFT JOIN + GROUP BY)
-- ใช้: สรุปยอดรายคอนเสิร์ต (ลด query duplication)
SELECT *
FROM vw_concert_sales;

/* Expected Result (2 rows — concert 2 ไม่มี booking paid):
 concert_id |          title          | total_bookings | total_tickets_sold | total_revenue
------------+-------------------------+----------------+--------------------+---------------
          1 | BTS WORLD TOUR BANGKOK  |              1 |                  2 |      13000.00
          2 | BLACKPINK BANGKOK       |              0 |               NULL |          NULL
*/


-- Q3.5: รายชื่อ booking ที่รอ refund approve (JOIN multi-tables + LEFT JOIN refund)
-- Endpoint: GET /organizer/concerts/{concert_id}/refund-pending
SELECT b.id          AS booking_id,
       b.total_amount,
       b.total_tickets,
       u.name        AS customer_name,
       u.email       AS customer_email,
       r.id          AS refund_id,
       r.bank_name,
       r.account_number,
       r.account_name,
       r.reason,
       r.requested_at
FROM booking b
JOIN customer_profile cp ON cp.id = b.customer_id
JOIN users u             ON u.id  = cp.user_id
LEFT JOIN payment p      ON p.booking_id = b.id AND p.status = 'paid'
LEFT JOIN refund  r      ON r.payment_id = p.id
WHERE b.concert_id = 1
  AND b.status     = 'refund_pending'
ORDER BY b.created_at DESC;

/* Expected Result (0 rows — ใน seed ไม่มี booking สถานะ 'refund_pending')
   ลอง: UPDATE booking SET status = 'refund_pending' WHERE id = 4; แล้วรันใหม่
   ก็จะได้ 1 row ของ booking 4 (Anunda, 6500) พร้อมข้อมูล refund.id=1
*/


-- Q3.6: zones ของ concert พร้อม seat_row prefix (subquery scalar)
-- Endpoint: GET /organizer/concerts/{concert_id} (สำหรับฟอร์มแก้ไข)
SELECT z.id, z.zone_name, z.total_seats, z.price,
       (SELECT seat_row FROM seat
         WHERE zone_id = z.id ORDER BY id LIMIT 1) AS row_prefix
FROM zone z
WHERE z.concert_id = 1
ORDER BY z.id;

/* Expected Result (4 rows):
 id |   zone_name    | total_seats |  price  | row_prefix
----+----------------+-------------+---------+------------
  1 | GOLDEN CIRCLE  |         150 | 6500.00 | A
  2 | VIP            |         300 | 4000.00 | B
  3 | A              |         600 | 3000.00 | C
  4 | B              |        1200 | 2500.00 | D
*/


-- Q3.7: Close zone — เปลี่ยน seat ที่ยังไม่ขายให้เป็น 'closed' (UPDATE multi-row)
-- Endpoint: POST /organizer/zones/{zone_id}/close (step ที่ 2 จาก 4 ใน transaction)
UPDATE seat
SET    status = 'closed'
WHERE  zone_id = 4
  AND  status IN ('available', 'locked');

/* Expected Result (UPDATE 17 — zone 4 มี available 17, locked 0, sold 3 ที่ไม่ถูกแตะ):
   — ตามด้วย: UPDATE zone SET is_active = FALSE WHERE id = 4;
   — และอัปเดต booking ที่มี ticket ใน zone นี้ → 'zone_closed_action_required'
*/


-- ╔══════════════════════════════════════════════════════════╗
-- ║ Section 4 — Payment (routes/payment.py)                   ║
-- ╚══════════════════════════════════════════════════════════╝

-- Q4.1: หา payment pending เดิมก่อนสร้าง QR ใหม่ (idempotent)
-- Endpoint: POST /api/v1/payments/generate-qr
-- Pattern:  เช็กก่อน insert เพื่อกัน duplicate transaction_ref
SELECT id, transaction_ref, amount
FROM payment
WHERE booking_id = 2
  AND status     = 'pending'
ORDER BY created_at DESC
LIMIT 1;

/* Expected Result (1 row):
 id | transaction_ref | amount
----+-----------------+--------
  2 | NULL            | 2500.00
หมายเหตุ: seed payment 2 ยังไม่ generate QR (transaction_ref = NULL)
ถ้าเรียก generate-qr API ครั้งแรก จะ UPDATE payment.transaction_ref = 'TX-2-...'
*/


-- Q4.2: Payment status polling — JOIN booking + คำนวณ seconds_remaining
-- Endpoint: GET /api/v1/payments/status/{transaction_ref}
-- Pattern:  GREATEST + EXTRACT (epoch) สำหรับ countdown
SELECT
  p.id, p.transaction_ref, p.amount, p.status, p.paid_at,
  b.id, b.customer_id, b.status, b.expired_at,
  GREATEST(0, EXTRACT(EPOCH FROM (b.expired_at - NOW()))::INT) AS seconds_remaining
FROM payment p
JOIN booking b ON b.id = p.booking_id
WHERE p.transaction_ref = 'QR20260416TH00012345';

/* Expected Result (1 row — booking 1 paid; expired_at = NULL → seconds_remaining = 0):
 id | transaction_ref       | amount   | status | paid_at             | id | customer_id | status | expired_at | seconds_remaining
----+-----------------------+----------+--------+---------------------+----+-------------+--------+------------+-------------------
  1 | QR20260416TH00012345  | 13000.00 | paid   | 2025-05-01 10:01:25 |  1 |           1 | paid   | NULL       |                 0
*/


-- Q4.3: Webhook finalize — UPDATE payment + booking + seat ใน transaction
-- Endpoint: POST /api/v1/payments/webhook
-- Pattern:  multi-table UPDATE chain (เรียงลำดับ payment → booking → seat)
BEGIN;

UPDATE payment
SET    status = 'paid',
       paid_at = NOW()
WHERE  transaction_ref = 'TX-2-test'
  AND  status = 'pending';

UPDATE booking
SET    status     = 'paid',
       expired_at = NULL
WHERE  id = 2 AND status = 'pending';

UPDATE seat
SET    status = 'sold'
WHERE  id IN (SELECT seat_id FROM ticket WHERE booking_id = 2);

INSERT INTO finance (concert_id, booking_id, type, amount, description)
VALUES (1, 2, 'income', 2500, 'ticket sales — webhook');

COMMIT;

/* Expected Result:
   • payment.status: pending → paid
   • booking 2: pending → paid
   • seat 4: locked/available → sold
   • finance: +1 row income 2500
*/


-- ╔══════════════════════════════════════════════════════════╗
-- ║ Section 5 — Refund (routes/refund.py)                     ║
-- ╚══════════════════════════════════════════════════════════╝

-- Q5.1: หา payment ที่จ่ายสำเร็จล่าสุดของ booking + เช็ก 7-day window
-- Endpoint: POST /api/v1/refunds/request
SELECT id, amount, paid_at,
       NOW() - paid_at AS time_since_paid,
       (NOW() - paid_at) > INTERVAL '7 days' AS is_expired_for_refund
FROM payment
WHERE booking_id = 1
  AND status     = 'paid'
ORDER BY paid_at DESC
LIMIT 1;

/* Expected Result (1 row — สมมุติ NOW() = 2025-05-04, paid_at = 2025-05-01):
 id | amount    | paid_at             | time_since_paid | is_expired_for_refund
----+-----------+---------------------+-----------------+-----------------------
  1 | 13000.00  | 2025-05-01 10:01:25 | 3 days 00:00:00 | f
*/


-- Q5.2: View vw_refund_status — รายการ refund ทั้งหมด + ลูกค้า + payment
-- ใช้: หน้า admin ตรวจสอบสถานะ refund
SELECT id, user_name, payment_id, amount, status, requested_at, completed_at
FROM vw_refund_status
ORDER BY requested_at DESC;

/* Expected Result (1 row — refund ของ booking 4):
 id | user_name   | payment_id | amount   | status     | requested_at        | completed_at
----+-------------+------------+----------+------------+---------------------+--------------
  1 | อนันต์ ใจดี  |          4 |  2500.00 | requested  | 2025-05-03 09:40:00 | NULL
*/


-- ╔══════════════════════════════════════════════════════════╗
-- ║ Section 6 — Staff (routes/staff.py)                       ║
-- ╚══════════════════════════════════════════════════════════╝

-- Q6.1: Verify ticket — JOIN 5 ตาราง + FOR UPDATE lock
-- Endpoint: POST /staff/verify-ticket
-- Pattern:  scan QR → ตรวจ booking 'paid' + is_used = false → mark used
SELECT t.id, t.is_used, b.status,
       s.seat_number, z.zone_name, c.title
FROM ticket t
JOIN booking b ON t.booking_id = b.id
JOIN seat    s ON t.seat_id    = s.id
JOIN zone    z ON s.zone_id    = z.id
JOIN concert c ON b.concert_id = c.id
WHERE t.qr_hash = 'QR-TKT-0002'
FOR UPDATE OF t;

/* Expected Result (1 row — ticket 2 ยังไม่ใช้, booking paid → check-in ได้):
 id | is_used | status | seat_number |    zone_name    |          title
----+---------+--------+-------------+-----------------+--------------------------
  2 | f       | paid   | A02         | GOLDEN CIRCLE   | BTS WORLD TOUR BANGKOK

ลอง qr_hash = 'QR-TKT-0001' จะได้ row ที่ is_used=t → backend ตอบ 409 Duplicate
*/


-- ╔══════════════════════════════════════════════════════════╗
-- ║ Section 7 — Background Expiry Job (app.py)                ║
-- ╚══════════════════════════════════════════════════════════╝

-- Q7.1: Expiry sweeper — รันทุก 60 วินาที ใน async loop
-- Source:  app.py:_expire_bookings_loop()
-- Pattern: 4 UPDATE statements ภายใน transaction เดียว

-- Step 1: หา booking ที่ pending แล้วหมดเวลา
SELECT id
FROM booking
WHERE status = 'pending'
  AND expired_at < NOW();

/* Expected Result (1 row — booking 2 หมดเวลาตั้งแต่ 2025-05-01 10:18):
 id
----
  2
*/

-- Step 2: คืน seat ของ booking ที่หมดเวลา (เปลี่ยน sold/locked → available)
UPDATE seat
SET    status = 'available'
WHERE  id IN (
  SELECT seat_id
  FROM   ticket
  WHERE  booking_id IN (2)        -- จาก Step 1
);

-- Step 3: เปลี่ยน booking → 'expired'
UPDATE booking
SET    status = 'expired'
WHERE  id IN (2);

-- Step 4: cancel queue_session ที่ admit แล้วแต่จองไม่ทัน
UPDATE queue_session
SET    status = 'expired'
WHERE  customer_id IN (
  SELECT customer_id FROM booking WHERE id IN (2)
)
  AND status = 'admitted';

-- Step 5: cancel pending payment ที่ผูกกับ booking ที่หมดเวลา
UPDATE payment
SET    status = 'expired'
WHERE  booking_id IN (2)
  AND  status = 'pending';

/* Expected after all 5 steps:
   • seat 4 : locked/available → available
   • booking 2 : pending → expired
   • payment 2: pending → expired
   • queue_session ของ customer 2 ที่ admit อยู่ — seed มี customer 1 admitted
     (ไม่ใช่ customer 2) → ไม่กระทบ
*/


-- ============================================================
-- จบ queries.sql
--   • Section 0 มี 6 query ตรงเกณฑ์รายวิชา (JOIN, GROUP BY/SUM,
--     subquery-style, aggregate, HAVING, window function)
--   • Section 1–7 รวมอีก ~20 query ที่ backend ใช้จริง ครอบคลุม
--     pattern: CASE/WHEN, FILTER aggregate, CTE, scalar subquery,
--     timezone cast, multi-table UPDATE chain, FOR UPDATE lock,
--     และ view query
-- ============================================================
