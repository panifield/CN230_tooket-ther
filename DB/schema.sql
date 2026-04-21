-- ============================================================
-- Tooket-ther Seed Data
-- CN230 Database Systems · ภาคเรียนที่ 2 ปีการศึกษา 2567
-- ============================================================
-- วิธีรัน:
--   psql tooket_ther < database/seed.sql
-- (ต้องรัน schema.sql ก่อน)
-- ============================================================

-- WARNING: use only in development
BEGIN;

DROP TABLE IF EXISTS ticket_checkin CASCADE;
DROP TABLE IF EXISTS refund CASCADE;
DROP TABLE IF EXISTS payment CASCADE;
DROP TABLE IF EXISTS ticket CASCADE;
DROP TABLE IF EXISTS booking CASCADE;
DROP TABLE IF EXISTS queue_session CASCADE;
DROP TABLE IF EXISTS seat CASCADE;
DROP TABLE IF EXISTS zone CASCADE;
DROP TABLE IF EXISTS concert CASCADE;
DROP TABLE IF EXISTS staff_profile CASCADE;
DROP TABLE IF EXISTS customer_profile CASCADE;
DROP TABLE IF EXISTS organizer_profile CASCADE;
DROP TABLE IF EXISTS social_account CASCADE;
DROP TABLE IF EXISTS finance CASCADE;
DROP TABLE IF EXISTS users CASCADE;

COMMIT;

-- =========================
-- USERS
-- =========================
CREATE TABLE users (
    id               SERIAL PRIMARY KEY,
    id_card          VARCHAR(20)     UNIQUE NOT NULL,
    name             VARCHAR(100)    NOT NULL,
    email            VARCHAR(150)    UNIQUE NOT NULL,
    role             VARCHAR(20)     NOT NULL CHECK (role IN ('customer','organizer','staff')),
    phone            VARCHAR(20)     NOT NULL,
    address          TEXT            NOT NULL,
    password         TEXT            NOT NULL,
    created_at       TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- =========================
-- SOCIAL ACCOUNT
-- =========================
CREATE TABLE social_account (
    id               SERIAL PRIMARY KEY,
    user_id          INT             NOT NULL REFERENCES users(id),
    social_user_id   VARCHAR(100)    NOT NULL,
    type_social      VARCHAR(20)     NOT NULL CHECK (type_social IN ('line','facebook','email')),
    UNIQUE (social_user_id, type_social)
);


-- =========================
-- CUSTOMER PROFILE
-- =========================
CREATE TABLE customer_profile (
    id              SERIAL PRIMARY KEY,
    user_id         INT             UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    location_score  INT             NOT NULL DEFAULT 0
);


-- =========================
-- ORGANIZER PROFILE
-- =========================
CREATE TABLE organizer_profile (
    id               SERIAL PRIMARY KEY,
    user_id          INT UNIQUE      NOT NULL REFERENCES users(id),
    tax_id           VARCHAR(50 ),
    company_name     VARCHAR(150)
);

-- =========================
-- STAFF PROFILE
-- =========================
CREATE TABLE staff_profile (
    id               SERIAL PRIMARY KEY,
    organizer_id     INT             NOT NULL REFERENCES organizer_profile(id),
    user_id          INT             NOT NULL REFERENCES users(id),
    shift_start      TIMESTAMP,
    shift_close      TIMESTAMP,
    staff_code       VARCHAR(50)     UNIQUE NOT NULL,
    status           VARCHAR(20)     NOT NULL CHECK (status IN ('active', 'inactive', 'suspended')),
                                     --status: ทำงาน, เลิกงานหรือไม่ทำงานแล้ว, ถูกระงับ(ทำผิด)
    UNIQUE (user_id)                       
);

-- =========================
-- CONCERT
-- =========================
CREATE TABLE concert (
    id               SERIAL PRIMARY KEY,
    organizer_id     INT             NOT NULL REFERENCES organizer_profile(id),
    title            VARCHAR(200)    NOT NULL,
    artist           VARCHAR(200),
    venue            VARCHAR(200),
    concert_datetime TIMESTAMP       NOT NULL,
    sale_open_at     TIMESTAMP,
    sale_close_at    TIMESTAMP,
    status           VARCHAR(20)     NOT NULL CHECK (status IN ('draft','on_sale','closed','cancelled'))
                                     -- status: draft คือ ยังไม่เปิดให้ user เห็นมีแค่ organizer ที่ไปแก้ไขข้อมูลได้
);

-- =========================
-- ZONE
-- =========================
CREATE TABLE zone (
    id                       SERIAL PRIMARY KEY,
    concert_id               INT             NOT NULL REFERENCES concert(id),
    zone_name                VARCHAR(100)    NOT NULL,
    total_seats              INT             NOT NULL CHECK (total_seats > 0), 
    min_booking_threshold    INT             NOT NULL DEFAULT 10,  --จำนวนขั้นต่ำก่อนปิดโซน
                                             CHECK (min_booking_threshold >= 0),
    price                    NUMERIC(10,2)   NOT NULL CHECK (price >= 0),
    is_active                BOOLEAN         NOT NULL DEFAULT TRUE,
    UNIQUE (concert_id, zone_name)
);

-- =========================
-- SEAT
-- =========================
CREATE TABLE seat (
    id               SERIAL PRIMARY KEY,
    zone_id          INT             NOT NULL REFERENCES zone(id),
    seat_number      VARCHAR(20)     NOT NULL,
    seat_row         VARCHAR(10),
    status           VARCHAR(20)     NOT NULL DEFAULT 'available'
                                     CHECK (status IN ('available','locked','reserved','sold')),
    CONSTRAINT unique_seat_in_zone UNIQUE (zone_id, seat_row, seat_number)
); 

-- =========================
-- QUEUE SESSION
-- =========================
CREATE TABLE queue_session (
    id               SERIAL PRIMARY KEY,
    customer_id      INT             NOT NULL REFERENCES customer_profile(id) ON DELETE CASCADE,
    concert_id       INT             NOT NULL REFERENCES concert(id) ON DELETE CASCADE,
    entered_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
    admitted_at      TIMESTAMP,
    expired_at       TIMESTAMP,
    priority_score   INT             NOT NULL DEFAULT 0,
    status           VARCHAR(20)     NOT NULL DEFAULT 'waiting',
                                     CHECK (status IN('waiting', 'admitted', 'expired', 'completed')),
                                     
    CONSTRAINT unique_customer_concert_queue UNIQUE (customer_id, concert_id)
);

-- =========================
-- BOOKING
-- =========================
CREATE TABLE booking (
    id               SERIAL PRIMARY KEY,
    customer_id      INT             NOT NULL REFERENCES customer_profile(id) ON DELETE RESTRICT,
    concert_id       INT             NOT NULL REFERENCES concert(id) ON DELETE RESTRICT,
    created_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
    expired_at       TIMESTAMP,
    total_amount     NUMERIC(10,2)   NOT NULL,
    total_tickets    INT,
    status           VARCHAR(20)     NOT NULL DEFAULT 'pending',
                                     CHECK (status IN ('pending','paid','cancelled','expired','refund')),
    delivery_type    VARCHAR(20)     NOT NULL DEFAULT 'digital',
                                     CHECK (delivery_type IN ('digital','pickup','postal'))
);

-- =========================
-- TICKET
-- =========================
CREATE TABLE ticket (
    id               SERIAL PRIMARY KEY,
    seat_id          INT             NOT NULL REFERENCES seat(id),
    booking_id       INT             NOT NULL REFERENCES booking(id),
    qr_hash          TEXT,
    is_used        BOOLEAN           NOT NULL DEFAULT FALSE,
    UNIQUE (seat_id)  -- กัน double booking
);

-- =========================
-- PAYMENT
-- =========================
CREATE TABLE payment (
    id               SERIAL PRIMARY KEY,
    booking_id       INT             NOT NULL REFERENCES booking(id) ON DELETE RESTRICT,
    amount           NUMERIC(10,2)   NOT NULL CHECK (amount > 0),
    created_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
    expired_at       TIMESTAMP,
    paid_at          TIMESTAMP,
    transaction_ref  VARCHAR(100)    UNIQUE,
    status           VARCHAR(20)     NOT NULL CHECK (status IN ('pending','paid','failed','expired'))
);


-- =========================
-- REFUND
-- =========================
CREATE TABLE refund (
    id               SERIAL PRIMARY KEY,
    payment_id       INT             NOT NULL REFERENCES payment(id),
    amount           NUMERIC(10,2)   NOT NULL CHECK (amount > 0),
    requested_at     TIMESTAMP       NOT NULL DEFAULT NOW(),
    approved_at      TIMESTAMP,
    completed_at     TIMESTAMP,
    status           VARCHAR(20)     NOT NULL 
                                     CHECK (status IN ('requested','approved', 'rejected', 'processing', 'completed'))
);

-- =========================
-- TICKET CHECKIN
-- =========================
CREATE TABLE ticket_checkin (
    id               SERIAL PRIMARY KEY,
    staff_id         INT             NOT NULL REFERENCES staff_profile(id),
    ticket_id        INT             NOT NULL REFERENCES ticket(id),
    checked_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
    status           VARCHAR(20)     NOT NULL DEFAULT 'checked'
                                     CHECK (status IN ('checked','duplicate','rejected')),
    UNIQUE (ticket_id)
);


-- =========================
-- FINANCE
-- =========================
CREATE TABLE finance (
    id               SERIAL PRIMARY KEY,
    concert_id       INT             REFERENCES concert(id),
    booking_id       INT             REFERENCES booking(id),
    type             VARCHAR(20)     NOT NULL
                                     CHECK (type IN ('income','expense','refund','payout')),
    amount           NUMERIC(10,2)   NOT NULL,
    description      TEXT            NOT NULL
);

-- ============================================================
-- INDEXES — เพิ่มความเร็วใน Query ที่ใช้บ่อย
-- ============================================================

--- Seat ---
CREATE INDEX idx_seat_zone_status ON seat(zone_id, status);

--- concert ---
CREATE INDEX idx_concert_status ON concert(status);
CREATE INDEX idx_concert_datetime ON concert(concert_datetime);

--- Ticket ---
CREATE INDEX idx_ticket_booking ON ticket(booking_id);

--- queuery_session ---
CREATE INDEX idx_queue_concert_status ON queue_session(concert_id, status);
CREATE INDEX idx_queue_priority_score
ON queue_session(concert_id, priority_score DESC, entered_at ASC);

CREATE INDEX idx_queue_waiting_only
ON queue_session(concert_id, priority_score DESC, entered_at)
WHERE status = 'waiting';

--- Zone ---
CREATE INDEX idx_zone_concert ON zone(concert_id);

--- Booking ---
CREATE INDEX idx_booking_customer_status ON booking(customer_id, status);
CREATE INDEX idx_booking_status ON booking(status);
CREATE INDEX idx_booking_concert ON booking(concert_id);
CREATE INDEX idx_booking_expired_pending 
ON booking(expired_at) 
WHERE status = 'pending';

--- Payment ---
CREATE INDEX idx_payment_booking ON payment(booking_id);
CREATE INDEX idx_payment_status ON payment(status);

--- Finance ---
CREATE INDEX idx_finance_concert ON finance(concert_id);
CREATE INDEX idx_finance_type ON finance(type);

--- refund ---
CREATE INDEX idx_refund_status ON refund(status);

-- ============================================================
-- VIEWS — Query 
-- ============================================================
-- View: booking summary : ใช้หน้า “ประวัติการจอง”
CREATE VIEW vw_booking_summary AS
SELECT 
    b.id AS booking_id,
    u.name AS user_name,
    c.title AS concert_title,
    c.concert_datetime,
    b.total_tickets,
    b.total_amount,
    b.status,
    b.created_at
FROM booking b
JOIN customer_profile cp ON b.customer_id = cp.id
JOIN users u ON cp.user_id = u.id
JOIN concert c ON b.concert_id = c.id;

-- View: ticket detail : ใช้แสดง ticket + seat
CREATE VIEW vw_ticket_detail AS
SELECT 
    t.id AS ticket_id,
    b.id AS booking_id,
    c.title AS concert_title,
    z.zone_name,
    s.seat_row,
    s.seat_number,
    t.is_used
FROM ticket t
JOIN booking b ON t.booking_id = b.id
JOIN concert c ON b.concert_id = c.id
JOIN seat s ON t.seat_id = s.id
JOIN zone z ON s.zone_id = z.id;

-- View: available seats : ใช้หน้าเลือกที่นั่ง
CREATE VIEW vw_available_seat AS
SELECT 
    s.id AS seat_id,
    z.zone_name,
    s.seat_row,
    s.seat_number,
    z.price,
    c.id AS concert_id
FROM seat s
JOIN zone z ON s.zone_id = z.id
JOIN concert c ON z.concert_id = c.id
WHERE s.status = 'available'
AND z.is_active = TRUE;

-- View: payment status : ใช้เช็คประวัติการจ่ายเงิน
CREATE VIEW vw_payment_status AS
SELECT 
    p.id AS payment_id,
    b.id AS booking_id,
    u.name AS user_name,
    p.amount,
    p.status,
    p.created_at,
    p.paid_at
FROM payment p
JOIN booking b ON p.booking_id = b.id
JOIN customer_profile cp ON b.customer_id = cp.id
JOIN users u ON cp.user_id = u.id;

-- View: concert sales summary : ใช้dashboard organizer
CREATE VIEW vw_concert_sales AS
SELECT 
    c.id AS concert_id,
    c.title,
    COUNT(DISTINCT b.id) AS total_bookings,
    SUM(b.total_tickets) AS total_tickets_sold,
    SUM(b.total_amount) AS total_revenue
FROM concert c
LEFT JOIN booking b 
    ON c.id = b.concert_id 
    AND b.status = 'paid'
GROUP BY c.id, c.title;

-- View: pending booking (หมดเวลา)
CREATE VIEW vw_expired_bookings AS
SELECT *
FROM booking
WHERE status = 'pending'
AND expired_at < NOW();

-- View: queue monitoring
CREATE VIEW vw_queue_status AS
SELECT 
    q.id,
    q.concert_id,
    c.title,
    u.name,
    q.priority_score,
    q.status,
    q.entered_at
FROM queue_session q
JOIN customer_profile cp ON q.customer_id = cp.id
JOIN users u ON cp.user_id = u.id
JOIN concert c ON q.concert_id = c.id;


CREATE VIEW vw_refund_status AS
SELECT 
    r.id,
    u.name AS user_name,
    p.id AS payment_id,
    r.amount,
    r.status,
    r.requested_at,
    r.completed_at
FROM refund r
JOIN payment p ON r.payment_id = p.id
JOIN booking b ON p.booking_id = b.id
JOIN customer_profile cp ON b.customer_id = cp.id
JOIN users u ON cp.user_id = u.id;


-- View: check-in status :ใช้หน้างานจริง
CREATE VIEW vw_checkin_status AS
SELECT 
    t.id AS ticket_id,
    c.title,
    u.name AS user_name,
    tc.status,
    tc.checked_at
FROM ticket_checkin tc
JOIN ticket t ON tc.ticket_id = t.id
JOIN booking b ON t.booking_id = b.id
JOIN customer_profile cp ON b.customer_id = cp.id
JOIN users u ON cp.user_id = u.id
JOIN concert c ON b.concert_id = c.id;