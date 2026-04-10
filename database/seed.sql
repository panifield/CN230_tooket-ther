-- ============================================================
-- Tooket-ther Seed Data
-- CN230 Database Systems · ภาคเรียนที่ 2 ปีการศึกษา 2567
-- ============================================================
-- วิธีรัน:
--   psql tooket_ther < database/seed.sql
-- (ต้องรัน schema.sql ก่อน)
-- ============================================================

-- ============================================================
-- 1. ORGANIZERS (3 ราย)
-- ============================================================
INSERT INTO organizers (organizer_id, name, email, phone, company_name) VALUES
(1, 'สมชาย วงศ์ดนตรี',   'somchai@bighit-th.com',  '0891234501', 'Big Hit Thailand'),
(2, 'นฤมล อีเวนต์',      'narumon@live-nation.co.th','0891234502', 'Live Nation Thailand'),
(3, 'ธนพล โปรโมชัน',     'thanapol@scg-event.com', '0891234503', 'SCG Event');

SELECT setval('organizers_organizer_id_seq', 3);

-- ============================================================
-- 2. USERS (12 ราย — ทั้งในและต่างประเทศ)
-- ============================================================
INSERT INTO users (user_id, name, email, phone, domicile, address, priority_status, auth_provider) VALUES
-- ผู้ใช้ในประเทศ (priority_status = 1)
(1,  'อนันต์ ใจดี',        'anun@gmail.com',        '0811111101', 'กรุงเทพมหานคร',  '10/5 ถ.สุขุมวิท แขวงคลองเตย กรุงเทพฯ',     1, 'line'),
(2,  'สุดา รักดนตรี',      'suda@gmail.com',        '0811111102', 'เชียงใหม่',       '25 ถ.นิมมานเหมินทร์ อ.เมือง เชียงใหม่',    1, 'facebook'),
(3,  'ปรีชา แฟนพันธุ์แท้', 'precha@hotmail.com',    '0811111103', 'ขอนแก่น',         '88 ถ.มิตรภาพ อ.เมือง ขอนแก่น',             1, 'line'),
(4,  'วิภา สุขสันต์',      'wipa@yahoo.com',        '0811111104', 'นครราชสีมา',      '44 ถ.มิตรภาพ อ.เมือง นครราชสีมา',          1, 'local'),
(5,  'กานต์ มีสุข',        'karn@gmail.com',        '0811111105', 'สงขลา',           '12 ถ.จุติอนุสรณ์ อ.เมือง สงขลา',           1, 'facebook'),
(6,  'นิชา พรรณงาม',       'nicha@gmail.com',       '0811111106', 'ภูเก็ต',          '33 ถ.เจ้าฟ้า อ.เมือง ภูเก็ต',              1, 'line'),
(7,  'ธีรพล ชอบเพลง',     'teerapon@outlook.com',  '0811111107', 'ระยอง',           '7 ถ.สุขุมวิท อ.เมือง ระยอง',               1, 'local'),
(8,  'ปิยะ วัฒนา',         'piya@gmail.com',        '0811111108', 'อุดรธานี',        '55 ถ.โพศรี อ.เมือง อุดรธานี',              1, 'facebook'),
-- ผู้ใช้ต่างประเทศ (priority_status = 0)
(9,  'Akira Tanaka',       'akira@japan.co.jp',     NULL,         'Tokyo, Japan',    '1-2-3 Shibuya, Tokyo',                      0, 'line'),
(10, 'Emily Chen',         'emily@sg.com',          NULL,         'Singapore',       '10 Orchard Road, Singapore',                0, 'facebook'),
(11, 'James Park',         'james@korea.kr',        NULL,         'Seoul, Korea',    '123 Gangnam-gu, Seoul',                     0, 'local'),
(12, 'Li Wei',             'liwei@china.cn',        NULL,         'Beijing, China',  '88 Wangfujing, Beijing',                    0, 'line');

SELECT setval('users_user_id_seq', 12);

-- ============================================================
-- 3. CONCERTS (3 งาน)
-- ============================================================
INSERT INTO concerts (concert_id, organizer_id, title, artist, venue, concert_date, concert_time, sale_open_at, status) VALUES
(1, 1, 'BTS WORLD TOUR: LOVE YOURSELF BANGKOK',
        'BTS', 'ราชมังคลากีฬาสถาน', '2025-08-15', '18:00:00',
        '2025-05-01 10:00:00', 'on_sale'),
(2, 2, 'BLACKPINK BORN PINK IN BANGKOK',
        'BLACKPINK', 'อิมแพ็ค อารีน่า เมืองทองธานี', '2025-09-20', '19:00:00',
        '2025-06-01 10:00:00', 'upcoming'),
(3, 3, 'TAYLOR SWIFT THE ERAS TOUR THAILAND',
        'Taylor Swift', 'ราชมังคลากีฬาสถาน', '2025-10-10', '18:30:00',
        '2025-06-15 10:00:00', 'upcoming');

SELECT setval('concerts_concert_id_seq', 3);

-- ============================================================
-- 4. ZONES (สร้าง 4 โซนต่อคอนเสิร์ต)
-- ============================================================
INSERT INTO zones (zone_id, concert_id, zone_name, price, total_seats, available_seats, min_threshold, is_active) VALUES
-- Concert 1: BTS
( 1, 1, 'GOLDEN CIRCLE', 9500.00,  200,  198, 20, TRUE),
( 2, 1, 'VIP',           6500.00,  500,  495, 30, TRUE),
( 3, 1, 'A',             4500.00, 1000,  980, 50, TRUE),
( 4, 1, 'B',             2500.00, 2000, 1990, 80, TRUE),
-- Concert 2: BLACKPINK
( 5, 2, 'GOLDEN CIRCLE', 9000.00,  150,  150, 15, TRUE),
( 6, 2, 'VIP',           6000.00,  400,  400, 25, TRUE),
( 7, 2, 'A',             4000.00,  800,  800, 40, TRUE),
( 8, 2, 'B',             2000.00, 1500, 1500, 60, TRUE),
-- Concert 3: Taylor Swift
( 9, 3, 'PIT',          10000.00,  300,  300, 25, TRUE),
(10, 3, 'VIP',           7500.00,  600,  600, 35, TRUE),
(11, 3, 'A',             5000.00, 1200, 1200, 60, TRUE),
(12, 3, 'B',             3000.00, 2500, 2500, 90, TRUE);

SELECT setval('zones_zone_id_seq', 12);

-- ============================================================
-- 5. SEATS (สร้างที่นั่งสำหรับ Concert 1 เพื่อทดสอบ)
--    Zone 1: GOLDEN CIRCLE (A01–A10 ตัวอย่าง 10 ที่)
--    Zone 2: VIP           (B01–B10 ตัวอย่าง 10 ที่)
--    Zone 3: A             (C01–C20 ตัวอย่าง 20 ที่)
--    Zone 4: B             (D01–D20 ตัวอย่าง 20 ที่)
-- ============================================================

-- Zone 1: GOLDEN CIRCLE
INSERT INTO seats (zone_id, seat_number, row_label, status) VALUES
(1,'A01','A','sold'),   (1,'A02','A','sold'),   (1,'A03','A','available'),
(1,'A04','A','available'),(1,'A05','A','locked'),(1,'A06','A','available'),
(1,'A07','A','available'),(1,'A08','A','available'),(1,'A09','A','available'),
(1,'A10','A','available');

-- Zone 2: VIP
INSERT INTO seats (zone_id, seat_number, row_label, status) VALUES
(2,'B01','B','sold'),   (2,'B02','B','sold'),   (2,'B03','B','sold'),
(2,'B04','B','sold'),   (2,'B05','B','sold'),   (2,'B06','B','available'),
(2,'B07','B','available'),(2,'B08','B','available'),(2,'B09','B','locked'),
(2,'B10','B','available');

-- Zone 3: A
INSERT INTO seats (zone_id, seat_number, row_label, status) VALUES
(3,'C01','C','available'),(3,'C02','C','available'),(3,'C03','C','sold'),
(3,'C04','C','sold'),    (3,'C05','C','available'),(3,'C06','C','available'),
(3,'C07','C','available'),(3,'C08','C','available'),(3,'C09','C','available'),
(3,'C10','C','available'),(3,'C11','C','available'),(3,'C12','C','available'),
(3,'C13','C','available'),(3,'C14','C','available'),(3,'C15','C','available'),
(3,'C16','C','available'),(3,'C17','C','available'),(3,'C18','C','available'),
(3,'C19','C','available'),(3,'C20','C','available');

-- Zone 4: B
INSERT INTO seats (zone_id, seat_number, row_label, status) VALUES
(4,'D01','D','available'),(4,'D02','D','available'),(4,'D03','D','available'),
(4,'D04','D','available'),(4,'D05','D','available'),(4,'D06','D','sold'),
(4,'D07','D','sold'),    (4,'D08','D','sold'),    (4,'D09','D','available'),
(4,'D10','D','available'),(4,'D11','D','available'),(4,'D12','D','available'),
(4,'D13','D','available'),(4,'D14','D','available'),(4,'D15','D','available'),
(4,'D16','D','available'),(4,'D17','D','available'),(4,'D18','D','available'),
(4,'D19','D','available'),(4,'D20','D','available');

-- ============================================================
-- 6. QUEUE_SESSIONS
--    จำลองคิวสำหรับ Concert 1
--    คนในประเทศ (priority=1) ได้ลำดับก่อน
-- ============================================================
INSERT INTO queue_sessions (user_id, concert_id, priority_score, entered_at, status) VALUES
(1,  1, 1, '2025-05-01 09:55:00', 'admitted'),  -- อนันต์ (TH) — เข้าแล้ว
(2,  1, 1, '2025-05-01 09:56:00', 'admitted'),  -- สุดา (TH) — เข้าแล้ว
(3,  1, 1, '2025-05-01 09:57:00', 'admitted'),  -- ปรีชา (TH) — เข้าแล้ว
(4,  1, 1, '2025-05-01 09:58:00', 'waiting'),   -- วิภา (TH) — รอ
(5,  1, 1, '2025-05-01 09:59:00', 'waiting'),   -- กานต์ (TH) — รอ
(9,  1, 0, '2025-05-01 09:50:00', 'waiting'),   -- Akira (JP) — เข้าเร็วแต่ priority ต่ำ
(10, 1, 0, '2025-05-01 09:51:00', 'waiting'),   -- Emily (SG)
(11, 1, 0, '2025-05-01 09:52:00', 'waiting');   -- James (KR)

-- ============================================================
-- 7. BOOKINGS
--    จำลองการจอง 5 รายการ
--    seat_id ดึงมาจาก Zone 1-4 ที่มี status = 'sold'/'locked'
-- ============================================================
-- หมายเหตุ: seat_id จาก INSERT ด้านบนเริ่มต้นที่ 1
-- Zone1: A01=1, A02=2   Zone2: B01=11..B05=15   Zone3: C03=23,C04=24   Zone4: D06=46..

INSERT INTO bookings (booking_id, user_id, seat_id, status, booked_at, expiry_time, confirmed_at, ticket_qr, delivery_method) VALUES
(1, 1,  1, 'confirmed', '2025-05-01 10:02:00', '2025-05-01 10:17:00', '2025-05-01 10:08:00',
    'TKT-2025-BTS-A01-USER1', 'digital'),
(2, 2,  2, 'confirmed', '2025-05-01 10:03:00', '2025-05-01 10:18:00', '2025-05-01 10:10:00',
    'TKT-2025-BTS-A02-USER2', 'digital'),
(3, 3, 11, 'confirmed', '2025-05-01 10:04:00', '2025-05-01 10:19:00', '2025-05-01 10:12:00',
    'TKT-2025-BTS-B01-USER3', 'postal'),
(4, 4, 12, 'confirmed', '2025-05-01 10:05:00', '2025-05-01 10:20:00', '2025-05-01 10:11:00',
    'TKT-2025-BTS-B02-USER4', 'digital'),
(5, 5,  5, 'pending',   '2025-05-01 10:06:00', '2025-05-01 10:21:00', NULL,
    NULL, 'digital');   -- ยังไม่จ่าย (soft lock)

SELECT setval('bookings_booking_id_seq', 5);

-- ============================================================
-- 8. PAYMENTS
--    ชำระเงินสำหรับ booking 1-4 (booking 5 ยังค้างอยู่)
-- ============================================================
INSERT INTO payments (booking_id, amount, method, status, transaction_ref, paid_at) VALUES
(1, 9500.00, 'qr_code', 'paid', 'TXN-20250501-001', '2025-05-01 10:08:00'),
(2, 9500.00, 'qr_code', 'paid', 'TXN-20250501-002', '2025-05-01 10:10:00'),
(3, 6500.00, 'qr_code', 'paid', 'TXN-20250501-003', '2025-05-01 10:12:00'),
(4, 6500.00, 'qr_code', 'paid', 'TXN-20250501-004', '2025-05-01 10:11:00');

-- ============================================================
-- 9. TICKET_CHECKS
--    จำลองการตรวจบัตรสำหรับ booking 1 และ 2
-- ============================================================
INSERT INTO ticket_checks (booking_id, checked_by, checked_at, result) VALUES
(1, 'checker_staff_01', '2025-08-15 17:45:00', 'valid'),
(2, 'checker_staff_01', '2025-08-15 17:46:00', 'valid');

-- ============================================================
-- ตรวจสอบผลลัพธ์หลัง seed
-- ============================================================
SELECT 'users'          AS tbl, COUNT(*) FROM users
UNION ALL
SELECT 'organizers',             COUNT(*) FROM organizers
UNION ALL
SELECT 'concerts',               COUNT(*) FROM concerts
UNION ALL
SELECT 'zones',                  COUNT(*) FROM zones
UNION ALL
SELECT 'seats',                  COUNT(*) FROM seats
UNION ALL
SELECT 'queue_sessions',         COUNT(*) FROM queue_sessions
UNION ALL
SELECT 'bookings',               COUNT(*) FROM bookings
UNION ALL
SELECT 'payments',               COUNT(*) FROM payments
UNION ALL
SELECT 'ticket_checks',          COUNT(*) FROM ticket_checks;
