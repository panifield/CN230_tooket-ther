-- ============================ ================================
-- queries.sql — Tooket-ther Core Queries (≥ 5 ข้อตามเกณฑ์)
-- Schema: database/schema.sql (A1 — ลลิตา)
-- Author: ปณิธาน (A2)
-- ============================================================

-- Q1: ดูที่นั่งว่างทั้งหมดใน concert ที่เลือก (JOIN หลายตาราง)
-- ใช้: หน้าเลือกที่นั่ง — แสดง available seat พร้อมโซนและราคา
SELECT s.id         AS seat_id,
       s.seat_row,
       s.seat_number,
       s.status,
       z.zone_name,
       z.price
FROM seat s
JOIN zone z ON s.zone_id = z.id
WHERE z.concert_id = %(concert_id)s
  AND s.status      = 'available'
  AND z.is_active   = TRUE
ORDER BY z.price DESC, s.seat_row, s.seat_number;

-- Q2: ยอดรายรับแยกโซน (GROUP BY + SUM + JOIN)
-- ใช้: Organizer dashboard — รายงานการเงินแต่ละโซน
SELECT z.zone_name,
       COUNT(DISTINCT b.id)  AS total_bookings,
       SUM(b.total_amount)   AS total_revenue
FROM booking b
JOIN customer_profile cp ON b.customer_id = cp.id
JOIN concert c            ON b.concert_id  = c.id
JOIN zone z               ON z.concert_id  = c.id
WHERE b.status       = 'paid'
  AND b.concert_id   = %(concert_id)s
GROUP BY z.zone_name
ORDER BY total_revenue DESC;

-- Q3: ประวัติการซื้อของผู้ใช้ (JOIN หลายตาราง + Subquery-style filter)
-- ใช้: หน้า "ตั๋วของฉัน" — ดูรายการจองทั้งหมด
SELECT b.id          AS booking_id,
       c.title        AS concert_name,
       c.concert_datetime,
       z.zone_name,
       s.seat_row,
       s.seat_number,
       b.total_amount,
       b.status,
       b.created_at
FROM booking b
JOIN customer_profile cp ON b.customer_id  = cp.id
JOIN concert c            ON b.concert_id   = c.id
JOIN ticket t             ON t.booking_id   = b.id
JOIN seat s               ON t.seat_id      = s.id
JOIN zone z               ON s.zone_id      = z.id
WHERE cp.user_id = %(user_id)s
ORDER BY b.created_at DESC;

-- Q4: Booking ที่หมดเวลาและยังไม่ชำระ (Expiry Job Query)
-- ใช้: Background task คืนที่นั่งอัตโนมัติ (Phase 5)
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

-- Q5: โซนที่มี confirmed booking น้อยกว่า min_booking_threshold (HAVING)
-- ใช้: Organizer — ตรวจสอบโซนที่ควรปิด (ยอดจองต่ำกว่าขั้นต่ำ)
SELECT z.id              AS zone_id,
       z.zone_name,
       z.min_booking_threshold,
       COUNT(b.id)        AS confirmed_bookings
FROM zone z
LEFT JOIN seat s  ON s.zone_id    = z.id
LEFT JOIN ticket t ON t.seat_id   = s.id
LEFT JOIN booking b ON t.booking_id = b.id AND b.status = 'paid'
WHERE z.concert_id = %(concert_id)s
  AND z.is_active  = TRUE
GROUP BY z.id, z.zone_name, z.min_booking_threshold
HAVING COUNT(b.id) < z.min_booking_threshold;

-- Q6:Priority Queue — เรียงลำดับคิวตาม priority_score DESC, entered_at ASC (ORDER BY)
-- ใช้: หน้า Queue Status — แสดงลำดับคิวแต่ละ concert
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
WHERE q.concert_id = %(concert_id)s
  AND q.status     = 'waiting'
ORDER BY q.priority_score DESC, q.entered_at ASC;
