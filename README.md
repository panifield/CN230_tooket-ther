# 🎫 Tooket-ther 

> แพลตฟอร์มจองตั๋วคอนเสิร์ตออนไลน์ยุคใหม่ — 
> โครงงานรายวิชา **CN230 Database Systems** · ภาคเรียนที่ 2 ปีการศึกษา 2568

[![FastAPI](https://img.shields.io/badge/FastAPI-0.135-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-336791?logo=postgresql)](https://www.postgresql.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite)](https://vitejs.dev/)
[![Course](https://img.shields.io/badge/Course-CN230-010120)]()

---

## 📖 ภาพรวม (Overview)

**Tooket-ther** คือเว็บแอปพลิเคชันจองตั๋วคอนเสิร์ตที่ออกแบบมาเพื่อแก้ปัญหาคลาสสิกของระบบจองตั๋ว เช่น เซิร์ฟเวอร์ล่มเมื่อมีผู้ใช้พร้อมกันจำนวนมาก, ลำดับคิวที่ไม่โปร่งใส และการแย่งที่นั่งกันแบบ race condition โดยมุ่งเน้นที่:

1. **ความโปร่งใส (Fairness):** Priority queue ที่ตรวจสอบได้ + real-time seat locking
2. **ความสะดวก (UX):** ขั้นตอนการจองสั้น เข้าใจง่าย รองรับทุก role
3. **ประสิทธิภาพ (Performance):** Async background expiry + connection pooling + index ครบ

---

## 🚀 Key Features

### 👤 Customer
- **Browse Events** — ดูคอนเสิร์ตที่กำลังเปิดขาย พร้อมรูป poster และข้อมูลสถานที่
- **Priority Queue** — เข้าคิวรอตามคะแนน priority (entered_at + location_score)
- **Real-time Seat Selection** — เลือกที่นั่งในโซนพร้อม seat locking ป้องกัน double booking
- **Payment** — ชำระเงินผ่าน QR (PromptPay)
- **My Tickets** — ตั๋วดิจิทัลพร้อม **QR Code** สำหรับเข้างาน
- **Refund** — ขอคืนเงินพร้อมแนบบัญชีธนาคาร, ติดตามสถานะ

### 🎤 Organizer
- **Create / Edit Concert** — สร้าง-แก้ไขคอนเสิร์ต (วันเวลา, สถานที่, sale window, รูป poster)
- **Zone & Pricing** — แบ่งโซนและกำหนดราคาแยก พร้อม `min_booking_threshold` สำหรับเปิด/ปิดโซนอัตโนมัติ
- **Sales Dashboard** — สรุปยอดขาย + รายได้แยกตามโซน (รองรับ view `vw_concert_sales`)
- **Refund Approval** — อนุมัติ/ปฏิเสธคำขอคืนเงิน

### 🛡️ Staff
- **QR Check-in** — สแกน QR ผ่านกล้อง (ใช้ `jsqr`) บันทึก `ticket_checkin` ป้องกันสแกนซ้ำ

---

## 🎨 Design System & UX/UI

ระบบดีไซน์ภายใต้ชื่อ **"Together AI: Coastal Edition"** — รายละเอียดเต็มอยู่ใน [`DESIGN.md`](./DESIGN.md)

| หัวข้อ | รายละเอียด |
| --- | --- |
| **Mood & Tone** | Airy / Optimistic / Professional |
| **Primary Palette** | Sky Blue `#AAD6FA` · Cream `#FCE6A9` · Midnight `#010120` · Sky Tint `#C5F6FA` |
| **Typography** | Headlines: `The Future` (500 weight, tight tracking) · Labels: `PP Neue Montreal Mono` (uppercase) |
| **Radii** | `8px` container · `4px` control (no pill shapes) |
| **Shadow** | Blue-tinted soft: `rgba(1, 1, 32, 0.06) 0 4px 12px` |
| **Glassmorphism** | `backdrop-filter: blur(20px)` + `rgba(255,255,255,0.55)` บน hero / cards |
| **Gradient** | `linear-gradient(135deg, #AAD6FA, #FCE6A9)` |

**Do:** ใช้ Midnight `#010120` เป็น anchor / Driftwood `#6f5e4e` สำหรับ metadata
**Don't:** ใช้สีดำล้วน · ใช้ pill rounded shapes

---

## 🏗️ Technical Architecture

```
┌──────────────────────┐      HTTPS/JSON      ┌─────────────────────┐      asyncpg pool      ┌──────────────────┐
│  Frontend (Vite +    │  ─────────────────►  │  FastAPI Backend    │  ───────────────────►  │   PostgreSQL     │
│  TypeScript strict)  │  ◄─────────────────  │  (uvicorn / async)  │  ◄───────────────────  │   14+            │
│  Hash Router · jsqr  │                      │  JWT · CORS · OAuth │                        │  12 tables/8 vw  │
└──────────────────────┘                      └─────────────────────┘                        └──────────────────┘
                                                        │
                                                        ▼
                                              ┌────────────────────┐
                                              │ Background Task    │
                                              │ Expiry loop (60s)  │
                                              │ pending → expired  │
                                              └────────────────────┘
```

**สถาปัตยกรรมหลัก:**
- **Decoupled Frontend / Backend** — frontend คือ static site, backend เปิด REST API ที่ `/api/*`
- **Hash Router** (frontend) — `#/dashboard`, `#/seats?concertId=...` (no server config required)
- **JWT Auth** — `routes/auth.py` ออก token, frontend เก็บใน `authStore` (`state/auth.ts`)
- **Async Expiry Task** — `_expire_bookings_loop()` ใน [`app.py`](./app.py) รันทุก 60 วินาที คืน seat ของ booking ที่หมดเวลา และ cascade ไปที่ `payment` / `queue_session`
- **OAuth** — รองรับ Line + Google (config ใน `config.py`)
- **Payment Webhook** — ตรวจ HMAC-SHA256 ด้วย `PAYMENT_WEBHOOK_SECRET`

**Routers (FastAPI):**

| Prefix | ไฟล์ | หน้าที่ |
| --- | --- | --- |
| `/auth` | `routes/auth.py` | สมัคร, login, OAuth callback, forgot password |
| `/booking` | `routes/booking.py` | List concerts, queue, zones, seats, create booking |
| `/organizer` | `routes/organizer.py` | CRUD concert, zone, pricing, sales reports, refund approval |
| `/payment` | `routes/payment.py` | Initiate, QR generation, webhook callback |
| `/refund` | `routes/refund.py` | Request, list, status |
| `/staff` | `routes/staff.py` | QR check-in |

ดู API spec ฉบับเต็มที่ [`routes/FRONTEND_API_GUIDE.md`](./routes/FRONTEND_API_GUIDE.md) หรือ Swagger ที่ `http://localhost:8000/docs`

---

## 🛠️ Tech Stack

### Frontend (`frontend_v2/`)
- **Vite 5** + **TypeScript 5.4** (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- **Vanilla DOM** (no React/Vue) — render ผ่าน helper `el()` ใน `utils/dom.ts`
- **Tailwind CSS 3.4** + design tokens จาก `src/styles/tokens.css`
- **jsQR 1.4** — สำหรับสแกน QR code ฝั่ง staff
- ไม่มี runtime dependency อื่น

### Backend (`/`)
- **FastAPI 0.135** + **Uvicorn**
- **psycopg2** + connection pool (`models.py`)
- **Alembic 1.18** สำหรับ migrations (`database/migrations/`)
- **PyJWT** สำหรับ access token, **bcrypt/passlib** สำหรับ password hashing
- **python-dotenv** อ่าน `.env`

### Database
- **PostgreSQL 14+**
- 12 tables · 8 views · ครอบคลุมทุก index ที่ query ใช้บ่อย (ดู `schema.sql`)

---

## 🗄️ Database Schema

ดูไฟล์เต็ม: [`database/schema.sql`](./database/schema.sql) · ER diagram: [`database/update_ERD.png`](./database/update_ERD.png) / [`database/ERD_photo.png`](./database/ERD_photo.png)

### Tables (12)

| Table | หน้าที่ |
| --- | --- |
| `users` | บัญชีผู้ใช้กลาง (id_card unique, role: customer/organizer/staff) |
| `social_account` | เชื่อม OAuth (line / facebook / google / email) |
| `customer_profile` | ข้อมูลเฉพาะลูกค้า + `location_score` สำหรับ priority queue |
| `organizer_profile` | ข้อมูลผู้จัด (tax_id, company_name) |
| `staff_profile` | สังกัด organizer + shift + `staff_code` |
| `concert` | คอนเสิร์ต (sale window, status, image_url) |
| `zone` | โซนภายในคอนเสิร์ต (price, total_seats, min_booking_threshold) |
| `seat` | ที่นั่งรายตัว (status: available/locked/sold/closed) |
| `queue_session` | เซสชันคิว (priority_score, entered_at, status) |
| `booking` | การจองรวม (status: pending/paid/cancelled/expired/...) |
| `ticket` | ตั๋วต่อที่นั่ง + `qr_hash` + `is_used` |
| `payment` / `refund` / `ticket_checkin` / `finance` | ชำระเงิน, คืนเงิน, check-in, รายงานการเงิน |

### Views (8) — สำหรับ reporting & UI

`vw_booking_summary` · `vw_ticket_detail` · `vw_available_seat` · `vw_payment_status` · `vw_concert_sales` · `vw_expired_bookings` · `vw_queue_status` · `vw_refund_status` · `vw_checkin_status`

### Indexes ที่สำคัญ
- `idx_queue_priority_score (concert_id, priority_score DESC, entered_at ASC)` — สำหรับ admit คิว
- `idx_seat_zone_status` — สำหรับเช็คที่นั่งว่างใน zone
- `idx_booking_expired_pending` (partial, `WHERE status='pending'`) — สำหรับ background expiry

---

## 📂 Project Structure

```
CN230_tooket-ther/
├── app.py                       # FastAPI entry + lifespan + expiry loop
├── config.py                    # Env config
├── models.py                    # DB connection pool
├── requirements.txt
├── routes/                      # FastAPI routers
│   ├── auth.py
│   ├── booking.py
│   ├── organizer.py
│   ├── payment.py
│   ├── refund.py
│   ├── staff.py
│   └── FRONTEND_API_GUIDE.md    # API contract
├── database/
│   ├── schema.sql               # DDL + indexes + views
│   ├── seed.sql                 # Sample data
│   ├── migrations/              # Alembic
│   └── image/                   # Concert poster assets
├── frontend_v2/                 # Active frontend (TypeScript)
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.ts              # Entry, route registration
│       ├── styles/              # tokens.css, base.css, components.css
│       ├── api/                 # Typed fetch clients
│       ├── state/               # authStore, EventBus
│       ├── views/               # หน้าแต่ละ route
│       ├── components/          # header, modals, seatGrid
│       └── utils/               # dom helpers, formatters
├── frontend/                    # Legacy frontend (kept for reference)
├── DESIGN.md
├── about_projrct.md
└── README.md
```

---

## ⚙️ Installation & Setup

### Prerequisites

| Tool | Version |
| --- | --- |
| Python | 3.10+ |
| Node.js | 18+ |
| PostgreSQL | 14+ |
| npm | 9+ |

### 1. Clone

```bash
git clone https://github.com/panifield/CN230_tooket-ther.git
cd CN230_tooket-ther
```

### 2. Backend setup

```bash
# สร้าง virtual env
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Environment variables

คัดลอก `.env.example` แล้วเติมค่าตามต้องการ:

```bash
cp .env.example .env
```

Keys หลักที่ต้องตั้ง:

| Key | คำอธิบาย |
| --- | --- |
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/tookettherdb` |
| `SECRET_KEY` / `JWT_SECRET_KEY` | Random string สำหรับเซ็น JWT |
| `JWT_EXPIRE_MINUTES` | อายุ token (default 60) |
| `LINE_CLIENT_ID` / `LINE_CLIENT_SECRET` | OAuth Line (optional) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth Google (optional) |
| `PAYMENT_WEBHOOK_SECRET` | Shared secret กับ payment gateway (HMAC-SHA256) |
| `PROMPTPAY_ID` | เบอร์มือถือ/เลขบัตรประชาชน สำหรับ QR PromptPay |
| `PORT` | Default `8000` |
| `APP_DEBUG` | `true` เปิด auto-reload |

### 4. Database bootstrap

```bash
# สร้างฐานข้อมูล
createdb tookettherdb

# โหลด schema + seed
psql tookettherdb < database/schema.sql
psql tookettherdb < database/seed.sql
```

### 5. รัน Backend

```bash
python app.py
# → http://localhost:8000
# → Swagger:  http://localhost:8000/docs
# → ReDoc:    http://localhost:8000/redoc
# → Health:   http://localhost:8000/health
```

### 6. รัน Frontend

```bash
cd frontend_v2
npm install
npm run dev
# → http://localhost:5173 (proxy /api → http://localhost:8000)
```

---

## 📜 Available Scripts

### Backend
| คำสั่ง | หน้าที่ |
| --- | --- |
| `python app.py` | รัน FastAPI + uvicorn (reload เมื่อ `APP_DEBUG=true`) |
| `alembic upgrade head` | รัน migrations |

### Frontend (`cd frontend_v2`)
| คำสั่ง | หน้าที่ |
| --- | --- |
| `npm run dev` | Vite dev server (port 5173) |
| `npm run build` | typecheck + build production bundle ลง `dist/` |
| `npm run typecheck` | `tsc --noEmit` strict |
| `npm run preview` | preview build |

---

## 📚 API Documentation

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`
- **Frontend Contract:** [`routes/FRONTEND_API_GUIDE.md`](./routes/FRONTEND_API_GUIDE.md) — รายการ endpoint + payload ที่ frontend ใช้ตรง ๆ

---

## 👥 Members

| No. | Student ID | Name | Nickname |
| --- | --- | --- | --- |
| 1 | 6710545010 | นพัตธีรา เหลาเกิ้มหุ่ง | ลานนา |
| 2 | 6710615144 | ปณิธาน ตันตื้อ | กาฟิวส์ |
| 3 | 6710615243 | ลลิตา ทัศนอนันชัย | หมิว |
| 4 | 6710685055 | พัชรพล มาลัยศรี | ปิงปอง |

---


