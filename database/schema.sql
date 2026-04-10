-- ============================================================
-- Tooket-ther Database Schema
-- CN230 Database Systems · ภาคเรียนที่ 2 ปีการศึกษา 2567
-- มหาวิทยาลัยธรรมศาสตร์ ศูนย์รังสิต
-- ============================================================
-- วิธีรัน:
--   createdb tooket_ther
--   psql tooket_ther < database/schema.sql
-- ============================================================

-- ล้างข้อมูลเก่า (สำหรับรันซ้ำ)
DROP TABLE IF EXISTS ticket_checks   CASCADE;
DROP TABLE IF EXISTS payments        CASCADE;
DROP TABLE IF EXISTS bookings        CASCADE;
DROP TABLE IF EXISTS queue_sessions  CASCADE;
DROP TABLE IF EXISTS seats           CASCADE;
DROP TABLE IF EXISTS zones           CASCADE;
DROP TABLE IF EXISTS concerts        CASCADE;
DROP TABLE IF EXISTS organizers      CASCADE;
DROP TABLE IF EXISTS users           CASCADE;

-- ============================================================
-- 1. USERS
--    เก็บข้อมูลลูกค้าทั่วไป
--    priority_status คำนวณจาก domicile เพื่อใช้จัดลำดับคิว
-- ============================================================
CREATE TABLE users (
    user_id         SERIAL          PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL,
    email           VARCHAR(150)    UNIQUE NOT NULL,
    phone           VARCHAR(20),
    domicile        VARCHAR(100),                       -- ภูมิลำเนา (จังหวัด/ประเทศ)
    address         TEXT,
    priority_status SMALLINT        NOT NULL DEFAULT 0  -- 1 = ในประเทศ, 0 = ต่างประเทศ
                    CHECK (priority_status IN (0, 1)),
    auth_provider   VARCHAR(20)     NOT NULL DEFAULT 'local'
                    CHECK (auth_provider IN ('local', 'line', 'facebook')),
    auth_id         VARCHAR(200)    UNIQUE,             -- ID จาก OAuth provider
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. ORGANIZERS
--    ผู้จัดงาน (แยกจาก users เพื่อสิทธิ์ต่างกัน)
-- ============================================================
CREATE TABLE organizers (
    organizer_id    SERIAL          PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL,
    email           VARCHAR(150)    UNIQUE NOT NULL,
    phone           VARCHAR(20),
    company_name    VARCHAR(200),
    auth_provider   VARCHAR(20)     NOT NULL DEFAULT 'local'
                    CHECK (auth_provider IN ('local', 'line', 'facebook')),
    auth_id         VARCHAR(200)    UNIQUE,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. CONCERTS
--    ข้อมูลงานคอนเสิร์ต
-- ============================================================
CREATE TABLE concerts (
    concert_id      SERIAL          PRIMARY KEY,
    organizer_id    INT             NOT NULL REFERENCES organizers(organizer_id)
                    ON DELETE RESTRICT,
    title           VARCHAR(200)    NOT NULL,
    artist          VARCHAR(200)    NOT NULL,
    venue           VARCHAR(200)    NOT NULL,
    concert_date    DATE            NOT NULL,
    concert_time    TIME            NOT NULL,
    sale_open_at    TIMESTAMP       NOT NULL,           -- วันเวลาเปิดขายบัตร
    description     TEXT,
    poster_url      TEXT,
    status          VARCHAR(20)     NOT NULL DEFAULT 'upcoming'
                    CHECK (status IN ('upcoming', 'on_sale', 'sold_out', 'cancelled', 'completed')),
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. ZONES
--    โซนที่นั่งภายในงานคอนเสิร์ต (One concert → Many zones)
-- ============================================================
CREATE TABLE zones (
    zone_id         SERIAL          PRIMARY KEY,
    concert_id      INT             NOT NULL REFERENCES concerts(concert_id)
                    ON DELETE CASCADE,
    zone_name       VARCHAR(50)     NOT NULL,           -- เช่น A, B, VIP, GOLDEN CIRCLE
    price           DECIMAL(10,2)   NOT NULL CHECK (price >= 0),
    total_seats     INT             NOT NULL CHECK (total_seats > 0),
    available_seats INT             NOT NULL CHECK (available_seats >= 0),
    min_threshold   INT             NOT NULL DEFAULT 10, -- ขั้นต่ำก่อนพิจารณาปิดโซน
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    CONSTRAINT available_lte_total CHECK (available_seats <= total_seats)
);

-- ============================================================
-- 5. SEATS
--    ที่นั่งรายบุคคล (One zone → Many seats)
-- ============================================================
CREATE TABLE seats (
    seat_id         SERIAL          PRIMARY KEY,
    zone_id         INT             NOT NULL REFERENCES zones(zone_id)
                    ON DELETE CASCADE,
    seat_number     VARCHAR(20)     NOT NULL,           -- เช่น A01, B12
    row_label       VARCHAR(5),                         -- เช่น A, B, C
    status          VARCHAR(20)     NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available', 'locked', 'sold', 'disabled')),
    CONSTRAINT unique_seat_in_zone UNIQUE (zone_id, seat_number)
);

-- ============================================================
-- 6. QUEUE_SESSIONS
--    จัดการลำดับคิวก่อนเข้าเลือกที่นั่ง
--    เรียงตาม priority_status DESC แล้ว entered_at ASC
-- ============================================================
CREATE TABLE queue_sessions (
    queue_id        SERIAL          PRIMARY KEY,
    user_id         INT             NOT NULL REFERENCES users(user_id)
                    ON DELETE CASCADE,
    concert_id      INT             NOT NULL REFERENCES concerts(concert_id)
                    ON DELETE CASCADE,
    priority_score  INT             NOT NULL DEFAULT 0, -- copy มาจาก users.priority_status
    entered_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    admitted_at     TIMESTAMP,                          -- เวลาที่ได้เข้าเลือกที่นั่ง
    status          VARCHAR(20)     NOT NULL DEFAULT 'waiting'
                    CHECK (status IN ('waiting', 'admitted', 'expired', 'done')),
    CONSTRAINT unique_user_concert_queue UNIQUE (user_id, concert_id)
);

-- ============================================================
-- 7. BOOKINGS
--    การจองที่นั่ง พร้อม Soft Lock และ expiry time
-- ============================================================
CREATE TABLE bookings (
    booking_id      SERIAL          PRIMARY KEY,
    user_id         INT             NOT NULL REFERENCES users(user_id)
                    ON DELETE RESTRICT,
    seat_id         INT             NOT NULL REFERENCES seats(seat_id)
                    ON DELETE RESTRICT,
    status          VARCHAR(20)     NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'refunded')),
    booked_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
    expiry_time     TIMESTAMP       NOT NULL
                    DEFAULT (NOW() + INTERVAL '15 minutes'),
    confirmed_at    TIMESTAMP,
    ticket_qr       TEXT            UNIQUE,             -- QR Code string สำหรับเข้างาน
    delivery_method VARCHAR(20)     NOT NULL DEFAULT 'digital'
                    CHECK (delivery_method IN ('digital', 'postal', 'pickup')),
    CONSTRAINT unique_seat_booking UNIQUE (seat_id)    -- ป้องกัน double booking
    -- หมายเหตุ: constraint นี้ใช้กับ status = 'confirmed' เท่านั้น
    -- ในทางปฏิบัติให้จัดการ logic ผ่าน Transaction + FOR UPDATE
);

-- ============================================================
-- 8. PAYMENTS
--    หลักฐานการชำระเงิน เชื่อมกับ Booking
-- ============================================================
CREATE TABLE payments (
    payment_id      SERIAL          PRIMARY KEY,
    booking_id      INT             NOT NULL REFERENCES bookings(booking_id)
                    ON DELETE RESTRICT,
    amount          DECIMAL(10,2)   NOT NULL CHECK (amount > 0),
    method          VARCHAR(30)     NOT NULL DEFAULT 'qr_code'
                    CHECK (method IN ('qr_code', 'credit_card', 'bank_transfer')),
    status          VARCHAR(20)     NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'refunded', 'failed')),
    transaction_ref VARCHAR(100)    UNIQUE,             -- reference จาก payment gateway
    paid_at         TIMESTAMP,
    refund_amount   DECIMAL(10,2)   DEFAULT 0,
    refund_at       TIMESTAMP,
    bank_account    VARCHAR(20),                        -- บัญชีรับเงินคืน
    bank_name       VARCHAR(100),
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. TICKET_CHECKS
--    บันทึกการตรวจบัตรหน้างาน (Ticket Checker)
-- ============================================================
CREATE TABLE ticket_checks (
    check_id        SERIAL          PRIMARY KEY,
    booking_id      INT             NOT NULL REFERENCES bookings(booking_id)
                    ON DELETE RESTRICT,
    checked_by      VARCHAR(100),                       -- ชื่อ/ID พนักงาน
    checked_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    result          VARCHAR(20)     NOT NULL
                    CHECK (result IN ('valid', 'invalid', 'already_used')),
    note            TEXT
);

-- ============================================================
-- INDEXES — เพิ่มความเร็วใน Query ที่ใช้บ่อย
-- ============================================================

-- ค้นหาที่นั่งตามสถานะ (ใช้บ่อยมากตอนเลือกที่นั่ง)
CREATE INDEX idx_seats_status        ON seats(status);
CREATE INDEX idx_seats_zone_status   ON seats(zone_id, status);

-- ดูประวัติการจองของ user
CREATE INDEX idx_bookings_user       ON bookings(user_id);
CREATE INDEX idx_bookings_status     ON bookings(status);
CREATE INDEX idx_bookings_expiry     ON bookings(expiry_time) WHERE status = 'pending';

-- ดึงข้อมูลคิวตาม concert
CREATE INDEX idx_queue_concert       ON queue_sessions(concert_id, status);
CREATE INDEX idx_queue_priority      ON queue_sessions(concert_id, priority_score DESC, entered_at ASC);

-- ดึงข้อมูลโซนตาม concert
CREATE INDEX idx_zones_concert       ON zones(concert_id) WHERE is_active = TRUE;

-- ตรวจสอบ payment โดย booking
CREATE INDEX idx_payments_booking    ON payments(booking_id);
CREATE INDEX idx_payments_status     ON payments(status);

-- ============================================================
-- VIEWS — Query ที่ใช้บ่อย บันทึกไว้เรียกง่าย
-- ============================================================

-- View: ที่นั่งว่างพร้อมราคา
CREATE VIEW v_available_seats AS
SELECT
    s.seat_id,
    s.seat_number,
    s.row_label,
    s.status,
    z.zone_id,
    z.zone_name,
    z.price,
    c.concert_id,
    c.title        AS concert_title,
    c.concert_date
FROM seats s
JOIN zones    z ON s.zone_id    = z.zone_id
JOIN concerts c ON z.concert_id = c.concert_id
WHERE s.status   = 'available'
  AND z.is_active = TRUE
  AND c.status   IN ('on_sale', 'upcoming');

-- View: สรุปรายรับแยกโซน
CREATE VIEW v_revenue_by_zone AS
SELECT
    c.concert_id,
    c.title        AS concert_title,
    z.zone_id,
    z.zone_name,
    COUNT(p.payment_id)          AS tickets_sold,
    COALESCE(SUM(p.amount), 0)   AS total_revenue,
    COALESCE(SUM(p.refund_amount), 0) AS total_refunded
FROM concerts c
JOIN zones    z ON z.concert_id  = c.concert_id
LEFT JOIN seats    s ON s.zone_id     = z.zone_id
LEFT JOIN bookings b ON b.seat_id     = s.seat_id AND b.status = 'confirmed'
LEFT JOIN payments p ON p.booking_id  = b.booking_id AND p.status = 'paid'
GROUP BY c.concert_id, c.title, z.zone_id, z.zone_name;
