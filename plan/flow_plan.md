# Tooket-ther — Flow Plan & Development Guide

**CN230 Database Systems · ภาคเรียนที่ 2 ปีการศึกษา 2567**  
**มหาวิทยาลัยธรรมศาสตร์ ศูนย์รังสิต**

---

## 1. ภาพรวมโปรเจกต์

Tooket-ther คือแพลตฟอร์มจองบัตรคอนเสิร์ตแบบ End-to-End พัฒนาด้วย **Python (Flask)** + **PostgreSQL** โดยเน้นการแก้ปัญหาความไม่เป็นธรรมในการเข้าถึงบัตร, การจองซ้ำซ้อน และการบริหารโซนที่นั่ง

| รายการ | รายละเอียด |
|---|---|
| Backend | Python 3.12, Flask, SQLAlchemy, psycopg2 |
| Database | PostgreSQL |
| Frontend |  |
| Auth | JWT + Line/Facebook OAuth |
| Version Control | Git + GitHub |

---

## 2. System Flow หลัก

### 2.1 User Flow (ลูกค้า)

```
[Login ผ่าน Line/Facebook]
        ↓
[ระบบตรวจ domicile → กำหนด Priority Score]
        ↓
[เข้า Priority Queue → รอลำดับตามสิทธิ์]
        ↓
[เลือก Concert → เลือก Zone → เลือก Seat]
        ↓
[Soft Lock ที่นั่ง 15 นาที (LOCK ใน DB)]
        ↓
[ชำระเงินผ่าน QR Code]
        ↓
[Payment Gateway ยืนยัน → COMMIT Transaction]
        ↓
[ระบบออก E-Ticket (QR Code บัตร)]
        ↓
[User เห็นสถานะ "ชำระแล้ว" ในหน้าตั๋วของฉัน]
```

> หากไม่ชำระภายใน 15 นาที → ระบบ Rollback → คืนสถานะที่นั่งเป็น "ว่าง" อัตโนมัติ

### 2.2 Ticket Checker Flow

```
[เปิดหน้า Checker]
        ↓
[สแกน QR Code บัตรของลูกค้า]
        ↓
[Query ตรวจสอบ: TicketID, UserID, ZoneID, SeatID]
        ↓
[แสดงผล "ถูกต้อง ✓" หรือ "ไม่ถูกต้อง ✗"]
        ↓
[อัปเดตสถานะบัตรเป็น "ใช้แล้ว" ใน DB]
```

### 2.3 Organizer Flow

```
[Login ในฐานะ Organizer]
        ↓
[ดู Dashboard รายรับ/รายจ่าย (แยกรายวัน/รวม)]
        ↓
[ตรวจสอบจำนวนผู้จองในแต่ละโซน]
        ↓
    [โซนต่ำกว่า threshold?]
    /              \
  ใช่              ไม่ใช่
   ↓                ↓
[ปิดโซน]       [ดำเนินการต่อ]
   ↓
[แจ้งเตือน User ในโซนนั้นทาง Email]
   ↓
[User เลือก: รับเงินคืน หรือ อัปเกรดโซน]
   ↓
[DB อัปเดตสถานะโซน + บันทึก Refund]
```

---

## 3. Database Schema (Core Entities)

### ตาราง User
```sql
CREATE TABLE users (
    user_id     SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) UNIQUE NOT NULL,
    address     TEXT,                          -- ใช้เป็น key กำหนด priority
    domicile    VARCHAR(100),                  -- ภูมิลำเนา
    priority_status INT DEFAULT 0,             -- คำนวณจาก domicile
    auth_provider VARCHAR(20),                 -- 'line' หรือ 'facebook'
    auth_id     VARCHAR(200) UNIQUE,
    created_at  TIMESTAMP DEFAULT NOW()
);
```

### ตาราง Concert & Zone
```sql
CREATE TABLE concerts (
    concert_id  SERIAL PRIMARY KEY,
    title       VARCHAR(200) NOT NULL,
    venue       VARCHAR(200),
    concert_date DATE,
    organizer_id INT REFERENCES users(user_id)
);

CREATE TABLE zones (
    zone_id     SERIAL PRIMARY KEY,
    concert_id  INT REFERENCES concerts(concert_id),
    zone_name   VARCHAR(50),
    price       DECIMAL(10,2),
    total_seats INT,
    available_seats INT,
    is_active   BOOLEAN DEFAULT TRUE,
    threshold   INT DEFAULT 10              -- ขั้นต่ำก่อนปิดโซน
);
```

### ตาราง Seat
```sql
CREATE TABLE seats (
    seat_id     SERIAL PRIMARY KEY,
    zone_id     INT REFERENCES zones(zone_id),
    seat_number VARCHAR(20),
    status      VARCHAR(20) DEFAULT 'available'
                CHECK (status IN ('available', 'locked', 'sold'))
);
```

### ตาราง Booking & Transaction
```sql
CREATE TABLE bookings (
    booking_id  SERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(user_id),
    seat_id     INT REFERENCES seats(seat_id),
    status      VARCHAR(20) DEFAULT 'pending'
                CHECK (status IN ('pending', 'confirmed', 'cancelled', 'refunded')),
    booked_at   TIMESTAMP DEFAULT NOW(),
    expiry_time TIMESTAMP,                  -- booked_at + 15 นาที
    ticket_qr   TEXT                        -- QR Code string
);

CREATE TABLE payments (
    payment_id  SERIAL PRIMARY KEY,
    booking_id  INT REFERENCES bookings(booking_id),
    amount      DECIMAL(10,2),
    method      VARCHAR(50) DEFAULT 'qr_code',
    status      VARCHAR(20) DEFAULT 'pending'
                CHECK (status IN ('pending', 'paid', 'refunded', 'failed')),
    paid_at     TIMESTAMP,
    bank_account VARCHAR(20)                -- สำหรับ refund
);
```

---

## 4. Query สำคัญ ≥ 5 ข้อ (เกณฑ์ 20%)

### Q1 — ดูที่นั่งว่างทั้งหมดในโซนที่เลือก (JOIN)
```sql
SELECT s.seat_id, s.seat_number, s.status, z.zone_name, z.price
FROM seats s
JOIN zones z ON s.zone_id = z.zone_id
WHERE z.concert_id = :concert_id
  AND s.status = 'available'
  AND z.is_active = TRUE
ORDER BY s.seat_number;
```

### Q2 — ยอดรายรับแยกโซน (GROUP BY + SUM)
```sql
SELECT z.zone_name,
       COUNT(p.payment_id) AS tickets_sold,
       SUM(p.amount)       AS total_revenue
FROM payments p
JOIN bookings b  ON p.booking_id = b.booking_id
JOIN seats s     ON b.seat_id = s.seat_id
JOIN zones z     ON s.zone_id = z.zone_id
WHERE p.status = 'paid'
  AND z.concert_id = :concert_id
GROUP BY z.zone_name
ORDER BY total_revenue DESC;
```

### Q3 — ประวัติการซื้อของ User (Subquery)
```sql
SELECT b.booking_id, c.title AS concert_name,
       z.zone_name, s.seat_number,
       p.amount, p.status, b.booked_at
FROM bookings b
JOIN seats s    ON b.seat_id = s.seat_id
JOIN zones z    ON s.zone_id = z.zone_id
JOIN concerts c ON z.concert_id = c.concert_id
JOIN payments p ON p.booking_id = b.booking_id
WHERE b.user_id = :user_id
ORDER BY b.booked_at DESC;
```

### Q4 — Booking ที่หมดเวลาและยังไม่จ่ายเงิน (Expiry)
```sql
SELECT b.booking_id, b.user_id, b.seat_id, b.expiry_time
FROM bookings b
WHERE b.status = 'pending'
  AND b.expiry_time < NOW();
-- ใช้รัน Cron Job เพื่อ Rollback ที่นั่งอัตโนมัติ
```

### Q5 — ตรวจสอบโซนที่มีผู้จองน้อยกว่า threshold (HAVING)
```sql
SELECT z.zone_id, z.zone_name, z.threshold,
       COUNT(b.booking_id) AS confirmed_bookings
FROM zones z
LEFT JOIN seats s  ON s.zone_id = z.zone_id
LEFT JOIN bookings b ON b.seat_id = s.seat_id
                    AND b.status = 'confirmed'
WHERE z.concert_id = :concert_id
  AND z.is_active = TRUE
GROUP BY z.zone_id, z.zone_name, z.threshold
HAVING COUNT(b.booking_id) < z.threshold;
```

### Q6 (โบนัส) — Priority Queue โดยใช้ domicile (ORDER BY priority)
```sql
SELECT u.user_id, u.name, u.domicile, u.priority_status,
       q.queue_position, q.entered_at
FROM queue_sessions q
JOIN users u ON q.user_id = u.user_id
WHERE q.concert_id = :concert_id
  AND q.status = 'waiting'
ORDER BY u.priority_status DESC, q.entered_at ASC;
```

---

## 5. การแบ่งงาน 4 คน

### คนที่ 1 — DB Architect A1 ลลิตา

**ไฟล์รับผิดชอบ:** `database/schema.sql`, `database/seed.sql`, `docs/ERD.png`

| งาน | รายละเอียด |
|---|---|
| ER Diagram | ออกแบบ entity ทั้งหมด + cardinality + normalization |
| DDL | เขียน CREATE TABLE ครบทุกตาราง |
| Constraints | กำหนด PK, FK, UNIQUE, CHECK, NOT NULL |
| Index | สร้าง index บน UserID, SeatID, BookingID, status |
| Seed Data | INSERT ข้อมูลตัวอย่างอย่างน้อย 3 concerts, 5 zones, 50 seats, 10 users |

> **ต้องทำก่อนคนอื่นทุกคน** — commit `schema.sql` ขึ้น GitHub ภายในวันแรก

---

### คนที่ 2 — Backend Core A2 ปณิธาน

**ไฟล์รับผิดชอบ:** `app.py`, `models.py`, `routes/auth.py`, `routes/booking.py`, `queries.sql`

| งาน | รายละเอียด |
|---|---|
| Flask Setup | ตั้ง Flask app, config, PostgreSQL connection ผ่าน psycopg2 |
| Auth | OAuth Login ผ่าน Line/Facebook API + JWT token |
| Priority Queue | Logic คำนวณ priority_status จาก domicile |
| Seat Soft Lock | BEGIN TRANSACTION → LOCK seat → set expiry_time |
| Expiry Timer | Background job คืนสถานะที่นั่งเมื่อ expiry_time ผ่านไป |
| Queries | เขียน Query ≥5 ข้อพร้อมอธิบาย (ดูหัวข้อ 4) |

---

### คนที่ 3 — Payment & Organizer A3 พัชรพล

**ไฟล์รับผิดชอบ:** `routes/payment.py`, `routes/organizer.py`, `routes/refund.py`

| งาน | รายละเอียด |
|---|---|
| QR Payment | สร้าง QR Code, รับ callback จาก Payment Gateway |
| Payment Status | อัปเดตสถานะใน DB แบบ real-time |
| Refund Logic | ตรวจสอบ 7-day window, บันทึก bank_account, คืนเงิน |
| Zone Management | ปิดโซน, ย้าย user, แจ้งเตือน Email |
| Organizer Dashboard | API endpoint ดึงข้อมูลรายรับ/รายจ่ายแยกวัน/รวม |

---

### คนที่ 4 — Frontend & Checker A4 นพัตธีรา 

**ไฟล์รับผิดชอบ:** `templates/`, `static/css/`, `static/js/`, `README.md`

| งาน | รายละเอียด |
|---|---|
| User UI | หน้า Login, เลือกโซน, แผนผังที่นั่ง, ชำระเงิน, ตั๋วของฉัน |
| Organizer UI | Dashboard รายรับ/รายจ่าย, จัดการโซน |
| Ticket Checker | หน้าสแกน QR + แสดงผลยืนยัน |
| Flask Integration | เชื่อม template กับ route ทุกหน้า |
| รายงาน + README | จัดทำ PDF รายงานฉบับสมบูรณ์ + README วิธีติดตั้ง |

---

## 6. Git Workflow — วิธีเชื่อมงานแต่ละคน

### Branch Structure

```
main          ← production-ready เท่านั้น (merge ก่อน demo)
└── dev       ← รวม feature ทั้งหมดก่อน merge ขึ้น main
    ├── pingpong_dev       (A1)
    ├── donpani_dev    (A2)
    ├── lanna_dev         (A3)
    └── mew_dev       (A4)
```

### คำสั่งที่แต่ละคนต้องใช้ทุกวัน

```bash
# 1. ดึงงานล่าสุดจาก dev ก่อนเริ่มทำงาน
git checkout dev
git pull origin dev

# 2. สร้าง branch ของตัวเอง (ทำครั้งแรกครั้งเดียว)
git checkout -b ชื่อ_dev

# 3. ทำงาน → commit บ่อยๆ
git add .
git commit -m "feat: เพิ่ม priority queue logic"

# 4. push ขึ้น GitHub
git push origin ชื่อ_dev

# 5. เปิด Pull Request เข้า dev บน GitHub
# → ให้คนอื่นอย่างน้อย 1 คน review ก่อน merge
```

### Commit Message Convention

```
feat: เพิ่ม feature ใหม่
fix:  แก้ bug
db:   เปลี่ยน schema หรือ query
ui:   แก้ไข template / CSS
docs: แก้ README หรือ comment
```

---

## 7. Folder Structure

```
cn230-tooket-ther/
├── app.py                    # A2: Flask entry point
├── models.py                 # A2: SQLAlchemy models (optional)
├── config.py                 # A2: config, DB URL จาก .env
├── requirements.txt          # ทุกคน: เพิ่ม library ที่ใช้
├── .env.example              # template ค่า environment (ไม่ commit .env จริง)
├── .gitignore
│
├── database/
│   ├── schema.sql            # A1: DDL ทั้งหมด
│   └── seed.sql              # A1: INSERT ข้อมูลตัวอย่าง
│
├── routes/
│   ├── auth.py               # A2: login, logout, OAuth
│   ├── booking.py            # A2: queue, seat lock, ticket
│   ├── payment.py            # A3: QR payment, status
│   ├── organizer.py          # A3: dashboard, zone management
│   └── refund.py             # A3: refund logic
│
├── templates/
│   ├── base.html             # A4: layout หลัก
│   ├── index.html            # A4: หน้าแรก
│   ├── booking.html          # A4: เลือกที่นั่ง
│   ├── payment.html          # A4: ชำระเงิน
│   ├── my_tickets.html       # A4: ตั๋วของฉัน
│   ├── organizer/
│   │   ├── dashboard.html    # A4: รายรับ/รายจ่าย
│   │   └── zones.html        # A4: จัดการโซน
│   └── checker.html          # A4: ตรวจบัตร
│
├── static/
│   ├── css/style.css         # A4
│   └── js/main.js            # A4
│
├── docs/
│   └── ERD.png               # A1: ER Diagram
│
└── README.md                 # A4: วิธีติดตั้งและรัน
```

---

## 8. Environment Setup (.env)

ไฟล์ `.env` ในเครื่องแต่ละคน (ห้าม commit ขึ้น GitHub):

```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/tooket_ther
SECRET_KEY=your-secret-key-here
LINE_CLIENT_ID=xxx
LINE_CLIENT_SECRET=xxx
FACEBOOK_CLIENT_ID=xxx
FACEBOOK_CLIENT_SECRET=xxx
```

ติดตั้ง `python-dotenv` แล้วโหลดใน `app.py`:

```python
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
```

---

## 9. วิธีติดตั้งและรันระบบ (สำหรับ README)

```bash
# 1. Clone repository
git clone https://github.com/yourteam/cn230-tooket-ther.git
cd cn230-tooket-ther

# 2. สร้าง virtual environment
python -m venv venv
source venv/bin/activate       # macOS/Linux
venv\Scripts\activate          # Windows

# 3. ติดตั้ง dependencies
pip install -r requirements.txt

# 4. ตั้งค่า PostgreSQL
createdb tooket_ther

# 5. สร้างตารางและใส่ข้อมูลตัวอย่าง
psql tooket_ther < database/schema.sql
psql tooket_ther < database/seed.sql

# 6. คัดลอกและแก้ไข .env
cp .env.example .env
# แก้ค่า DATABASE_URL และ SECRET_KEY

# 7. รันระบบ
flask run
# เปิด http://localhost:5000
```

---

## 10. Timeline (Proposal 30 มี.ค. → Final 27 เม.ย.)

| สัปดาห์ | A1 (DB) | A2 (Backend) | A3 (Payment) | A4 (Frontend) |
|---|---|---|---|---|
| สัปดาห์ 1 | ✅ schema.sql, seed.sql, ERD | ตั้ง Flask + DB connection | — | ตั้ง templates พื้นฐาน |
| สัปดาห์ 2 | ปรับ schema ตาม feedback | Priority Queue + Soft Lock | Payment + Refund flow | หน้า User (Login, จอง, จ่าย) |
| สัปดาห์ 3 | เพิ่ม Index + View | เขียน Query ≥5 ข้อ | Zone Management + Dashboard API | Checker UI + Organizer UI |
| สัปดาห์ 4 | — | Integration Test | Integration Test | รายงาน PDF + ซ้อม Demo |

---

## 11. Checklist ก่อนส่ง Final

- [ ] GitHub Repository เป็น Public + มี README
- [ ] `schema.sql` รันได้โดยไม่มี error
- [ ] `seed.sql` ใส่ข้อมูลตัวอย่างครบ
- [ ] E/R Diagram อยู่ในโฟลเดอร์ `docs/`
- [ ] มี Query ≥5 ข้อพร้อมคำอธิบาย
- [ ] ระบบทำ CRUD ได้ครบ (Create, Read, Update, Delete)
- [ ] Demo video 5–10 นาทีแสดงการทำงานจริง
- [ ] รายงาน PDF ครบทุกหัวข้อตาม rubric
- [ ] สมาชิกทุกคนพร้อมนำเสนอและตอบคำถาม

---

*จัดทำโดย: นพัตธีรา / ปณิธาน / ลลิตา / พัชรพล — กลุ่ม Tooket-ther*