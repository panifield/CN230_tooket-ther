-- ============================================================
-- Tooket-ther Seed Data
-- CN230 Database Systems · ภาคเรียนที่ 2 ปีการศึกษา 2567
-- ============================================================
-- วิธีรัน:
--   psql tooket_ther < database/seed.sql
-- (ต้องรัน schema.sql ก่อน)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. USERS (Organizer + Staff + Customer)
-- ============================================================
INSERT INTO users (id, id_card, name, email, role, phone, address, password) VALUES
-- Organizer
(1, '94038203838', 'สุพรัตน์ วงศวาง' ,'Suparat_t@gmail.com'    ,'organizer'    , '0648763092'        ,'Bangkok'  ,'Suprarut45.'),
(2, '17283737282', 'Anunda Sery'  ,'Anunda_se@gmail.com'    ,'organizer'    , '0648745091'        ,'England'  ,'Anunda_organiz3.'),

-- Staff
(3, '11110987172', 'กิติรัตน์ มีนาสวย' ,'gitiratt@gmail.com'     ,'staff'        , '0647563092'         ,'Bangkok'  ,'Gitt7.68G'),

-- Customer
(4, '12382938491', 'อนันต์ ใจดี'     ,'anunda_d@gmail.com'     ,'customer'     , '0548763088'         ,'Bangkok'  ,'Anunnnn23.'),
(5, '29384719182', 'สุดา รักดนตรี'   ,'suda_s@gmail.com'       ,'customer'     , '0888763066'         ,'Chiangmai','sudarat123.'),
(6, '19191919191', 'Akira Tanaka' ,'akira@gmail.com'        ,'customer'      , '0647763097'         ,'Japan'    ,'Akira_ra8.');

-- ============================================================
-- SOCIAL ACCOUNT
-- ============================================================
INSERT INTO social_account(user_id, type_social, social_user_id) VALUES
(1, 'line',      'U4af4980629'),
(2, 'email',     'Anunda_se@gmail.com'),
(3, 'facebook',  '10234567891234567'),
(4, 'facebook',  '1023456759123456'),
(5, 'email',     'suda_s@gmail.com'),
(6, 'email',     'akira@gmail.com');

-- ============================================================
-- 2. customer PROFILE
-- ============================================================
INSERT INTO customer_profile(id, user_id, location_score) VALUES
(1, 4,  1),
(2, 5,  2),
(3, 6,  3);


-- ============================================================
-- 2. ORGANIZER PROFILE
-- ============================================================
INSERT INTO organizer_profile (id, user_id, tax_id, company_name) VALUES
(1, 1, 'TAX001','Big Hit Thailand'),
(2, 2, 'TAX002','Live Nation Thailand');


-- ============================================================
-- 3. STAFF PROFILE
-- ============================================================
INSERT INTO staff_profile (id, organizer_id, user_id, staff_code, status) VALUES
(1, 1, 3, 'STAFF001','active');


-- ============================================================
-- 4. CONCERT
-- ============================================================
INSERT INTO concert (id, organizer_id, title, artist, venue, concert_datetime, sale_open_at, status) VALUES
(1, 1, 'BTS WORLD TOUR BANGKOK' ,'BTS'      , 'Rajamangala Stadium', '2025-08-15 18:00:00', '2025-05-01 10:00:00','on_sale'),
(2, 2, 'BLACKPINK BANGKOK'      ,'BLACKPINK', 'Impact Arena'       , '2025-09-20 19:00:00', '2025-06-01 10:00:00','closed');


-- ============================================================
-- 5. ZONE
-- ============================================================
INSERT INTO zone 
(id, concert_id, zone_name, total_seats, min_booking_threshold, price, is_active) 
VALUES
-- concert_1
(1, 1, 'GOLDEN CIRCLE', 150, 10, 6500, TRUE),
(2, 1, 'VIP',           300, 10, 4000, TRUE),
(3, 1, 'A',             600, 10, 3000, TRUE),
(4, 1, 'B',            1200, 10, 2500, TRUE),

-- concert_2
(5, 2, 'VIP',           150, 10, 7500, TRUE),
(6, 2, 'A',             300, 10, 5000, TRUE),
(7, 2, 'C',             600, 10, 4200, TRUE),
(8, 2, 'B',            1200, 10, 3500, TRUE);


-- ============================================================
-- 6. SEATS (สร้างที่นั่งสำหรับ Concert 1 เพื่อทดสอบ)
--    Zone 1: GOLDEN CIRCLE (A01–A10 ตัวอย่าง 10 ที่)
--    Zone 2: VIP           (B01–B10 ตัวอย่าง 10 ที่)
--    Zone 3: A             (C01–C20 ตัวอย่าง 20 ที่)
--    Zone 4: B             (D01–D20 ตัวอย่าง 20 ที่)
-- ============================================================
-- Zone 1: GOLDEN CIRCLE
INSERT INTO seat (id, zone_id, seat_number, seat_row, status) VALUES
(1, 1,'A01','A','sold')     ,  (2, 1,'A02','A','sold')      ,   (3, 1,'A03','A','available'),
(4, 1,'A04','A','available'),  (5, 1,'A05','A','locked')    ,   (6, 1,'A06','A','available'),
(7, 1,'A07','A','available'),  (8, 1,'A08','A','available') ,   (9, 1,'A09','A','available'),
(10,1,'A10','A','available');

-- Zone 2: VIP
INSERT INTO seat (id, zone_id, seat_number, seat_row, status) VALUES
(11, 2,'B01','B','sold')     , (12, 2,'B02','B','sold')     , (13, 2,'B03','B','sold'),
(14, 2,'B04','B','sold')     , (15, 2,'B05','B','sold')     , (16, 2,'B06','B','available'),
(17, 2,'B07','B','available'), (18, 2,'B08','B','available'), (19, 2,'B09','B','locked'),
(20, 2,'B10','B','available');

-- Zone 3: A
INSERT INTO seat (id, zone_id, seat_number, seat_row, status) VALUES
(21, 3,'C01','C','available'), (22, 3,'C02','C','available'), (23, 3,'C03','C','sold'),
(24, 3,'C04','C','sold')     , (25, 3,'C05','C','available'), (26, 3,'C06','C','available'),
(27, 3,'C07','C','available'), (28, 3,'C08','C','available'), (29, 3,'C09','C','available'),
(30, 3,'C10','C','available'), (31, 3,'C11','C','available'), (32, 3,'C12','C','available'),
(33, 3,'C13','C','available'), (34, 3,'C14','C','available'), (35, 3,'C15','C','available'),
(36, 3,'C16','C','available'), (37, 3,'C17','C','available'), (38, 3,'C18','C','available'),
(39, 3,'C19','C','available'), (40, 3,'C20','C','available');

-- Zone 4: B
INSERT INTO seat (id, zone_id, seat_number, seat_row, status) VALUES
(41, 4,'D01','D','available'), (42, 4,'D02','D','available'), (43, 4,'D03','D','available'),
(44, 4,'D04','D','available'), (45, 4,'D05','D','available'), (46, 4,'D06','D','sold'),
(47, 4,'D07','D','sold')     , (48, 4,'D08','D','sold')     , (49, 4,'D09','D','available'),
(50, 4,'D10','D','available'), (51, 4,'D11','D','available'), (52, 4,'D12','D','available'),
(53, 4,'D13','D','available'), (54, 4,'D14','D','available'), (55, 4,'D15','D','available'),
(56, 4,'D16','D','available'), (57, 4,'D17','D','available'), (58, 4,'D18','D','available'),
(59, 4,'D19','D','available'), (60, 4,'D20','D','available');


-- ============================================================
-- 7. QUEUE SESSION
-- ============================================================
INSERT INTO queue_session 
(id, customer_id, concert_id, priority_score, entered_at, admitted_at, expired_at, status) 
VALUES
(1, 1, 1, 51, '2025-05-01 10:00:10', '2025-05-01 10:02:00', NULL, 'admitted'),
(2, 2, 1, 62, '2025-05-01 10:00:15', NULL, '2025-05-01 11:10:00', 'waiting'),
(3, 3, 1, 73, '2025-05-01 10:00:40', NULL, '2025-05-01 11:10:00', 'waiting');


-- ============================================================
-- 8. BOOKING
-- ============================================================
INSERT INTO booking
(id, customer_id, concert_id, created_at, expired_at, total_amount, total_tickets, status, delivery_type)
VALUES
-- paid แล้ว (มีการจ่ายเงินสำเร็จ)
(1, 1, 1, '2025-05-01 10:01:00', NULL,                 13000, 2, 'paid',     'digital'),

-- pending (กำลังรอจ่ายเงิน)
(2, 2, 1, '2025-05-01 10:03:00', '2025-05-01 10:18:00', 2500,  1, 'pending',  'digital'), -- expire 15 minute ต้องไปกำหนดเวลาใน logic แทนนะ

-- expired (จองแล้วไม่จ่าย)
(3, 3, 1, '2025-05-01 10:05:00', '2025-05-01 10:20:00', 4000,  1, 'expired',  'pickup'),

-- cancelled (ผู้ใช้ยกเลิก)
(4, 1, 1, '2025-05-01 10:20:00', NULL,                  6500,  1, 'cancelled','postal'); -- ตัดสินใจไม่ไปแล้ว


-- ============================================================
-- 9. TICKET
-- ============================================================
INSERT INTO ticket (id, seat_id, booking_id, qr_hash, is_used)
VALUES
-- booking 1 (paid → มี 2 ใบ)
(1, 1, 1, 'QR-TKT-0001', TRUE),
(2, 2, 1, 'QR-TKT-0002', FALSE),

-- booking 2 (pending → ยังไม่ควรมี ticket จริง แต่ใส่ไว้ test)
(3, 4, 2, 'QR-TKT-0003', FALSE);


-- ============================================================
-- 10. PAYMENT
-- ============================================================
INSERT INTO payment(id, booking_id, amount, created_at, expired_at, paid_at, transaction_ref, status) VALUES
-- paid แล้ว
(1, 1, 13000, '2025-05-01 10:01:10', NULL, '2025-05-01 10:01:25', 'QR20260416TH00012345', 'paid'),

-- pending 
(2, 2, 2500, '2025-05-01 10:03:40', '2025-05-01 10:18:40', NULL, NULL, 'pending'),

-- expired (หมดเวลาแล้ว)
(3, 3, 4000, '2025-05-01 10:05:45', '2025-05-01 10:20:45', NULL, NULL, 'expired'),

(4, 4, 6500,  '2025-05-01 10:20:10', NULL, '2025-05-01 10:20:35', 'QR20232416TH00012345', 'paid'); --- ที่จะคืนตัง


-- ============================================================
-- 12. REFUND
-- ============================================================
INSERT INTO refund (id, payment_id, requested_at, approved_at, completed_at, amount, status)
VALUES
(1, 4, '2025-05-03 09:40:00', NULL, NULL, 2500, 'requested');


-- ============================================================
-- 13. CHECK-IN
-- ============================================================
INSERT INTO ticket_checkin (id, staff_id, ticket_id, checked_at, status) VALUES
(1, 1,  1, '2025-08-15 18:10:00', 'checked');


-- ============================================================
-- 14. FINANCE
-- ============================================================
INSERT INTO finance (id, concert_id, booking_id, type, amount, description) VALUES
(1, 1,  1,  'income',   13000,  'ticket sales'),
(2, 1,  4 , 'refund',   2500,   'refund');

COMMIT;

-- ============================================================
-- ตรวจสอบผลลัพธ์หลัง seed
-- ============================================================
SELECT 'users' AS tbl,      COUNT(*) FROM users
UNION ALL
SELECT 'social_account',    COUNT(*) FROM social_account
UNION ALL
SELECT 'customer_profile',  COUNT(*) FROM customer_profile
UNION ALL
SELECT 'organizer_profile', COUNT(*) FROM organizer_profile
UNION ALL
SELECT 'staff_profile',     COUNT(*) FROM staff_profile
UNION ALL
SELECT 'concert',           COUNT(*) FROM concert
UNION ALL
SELECT 'zone',              COUNT(*) FROM zone
UNION ALL
SELECT 'seat',              COUNT(*) FROM seat
UNION ALL
SELECT 'queue_session',     COUNT(*) FROM queue_session
UNION ALL
SELECT 'booking',           COUNT(*) FROM booking
UNION ALL
SELECT 'ticket',            COUNT(*) FROM ticket
UNION ALL
SELECT 'payment',           COUNT(*) FROM payment
UNION ALL
SELECT 'refund',            COUNT(*) FROM refund
UNION ALL
SELECT 'ticket_checkin',    COUNT(*) FROM ticket_checkin
UNION ALL
SELECT 'finance',           COUNT(*) FROM finance;
