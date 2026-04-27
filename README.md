# 🎫 Tooket-ther

> Premium concert ticketing — fairness, transparency, and a sophisticated concierge UX.
> โครงงานรายวิชา **CN230 Database Systems** · ภาคเรียนที่ 2 ปีการศึกษา 2568

[![FastAPI](https://img.shields.io/badge/FastAPI-0.135-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-336791?logo=postgresql)](https://www.postgresql.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite)](https://vitejs.dev/)
[![Course](https://img.shields.io/badge/Course-CN230-010120)]()

---

## 📖 Overview

**Tooket-ther** เป็นแพลตฟอร์มจองตั๋วคอนเสิร์ตแบบ end-to-end ที่ออกแบบมาเพื่อจัดการ **ปัญหาคลาสสิกของระบบจองตั๋ว** อย่างจริงจัง:

- **Race conditions ในการเลือกที่นั่ง** — แก้ด้วย transactional `SELECT … FOR UPDATE` + state machine ของ `seat`
- **คิวที่ไม่โปร่งใส** — แก้ด้วย priority queue ที่ score ตรวจสอบได้ + organizer-controlled admission
- **Booking ค้างที่ปิดที่นั่งไว้ตลอดกาล** — แก้ด้วย background expiry loop ที่ cascade คืน seat / queue / payment
- **การคืนเงินที่ผิดพลาด** — แก้ด้วย unique constraints + idempotent webhook + 7-day window policy

ทุกอย่างห่อด้วย **Coastal Edition** — design system แนว premium concierge ที่เน้น glassmorphism, sharp radii, และ palette ฟ้า-ครีม-มิดไนต์

---

## 🚀 Key Features

### 👤 Customer
- **Browse Events** — ดูคอนเสิร์ตที่กำลังเปิดขาย พร้อมรูป poster, รายละเอียดสถานที่, sale window
- **Priority Queue** — เข้าคิวรอ คะแนน priority คำนวณจาก `customer_profile.location_score` + เวลาเข้าแถว (`entered_at`); status realtime polling ทุก 3 วินาที
- **Real-time Seat Selection** — เลือกที่นั่งใน zone พร้อม **soft-lock 15 นาที** ป้องกัน double booking ผ่าน `SELECT FOR UPDATE`
- **PromptPay Payment** — สร้าง EMVCo QR แบบ dynamic (CRC16/CCITT-FALSE checksum) ฝั่ง backend; frontend poll status จนกว่า webhook จะเข้ามา
- **My Tickets** — แสดงตั๋วเป็น stub design พร้อม QR code (`qr_hash` per ticket) สำหรับ scan ที่หน้างาน
- **Refund** — ขอคืนเงินเต็มจำนวนภายใน **7 วัน** หลัง payment ถ้ายังไม่ check-in; แนบบัญชีธนาคาร
- **Voucher / Rebook** — ถ้า organizer ยกเลิก zone ที่จองไว้ booking จะเข้าสถานะ `zone_closed_action_required` ลูกค้าเลือกได้ระหว่าง refund หรือเปลี่ยนที่นั่งใหม่

### 🎤 Organizer
- **Create Concert** — multipart form (title, artist, venue, sale window, รูป poster, zones JSON); auto-generate seats ตาม `total_seats` ของแต่ละ zone
- **Edit Concert** — แก้ไขข้อมูลคอนเสิร์ต + เพิ่ม / ลบ / แก้ไข zone ได้ (ลบ zone ได้เฉพาะเมื่อยังไม่มีตั๋วถูกขาย)
- **Soft-delete / Cancel Concert** — `DELETE` flip status เป็น `cancelled` (ไม่ลบ row จริง) เพื่อรักษา audit trail; bookings ที่ active จะถูก mark `zone_closed_action_required`
- **Queue Admission Control** — ดู queue ทั้งหมด → กด admit ทีละกลุ่ม / override priority_score
- **Sales Dashboard** — สรุปยอดขายรายคอนเสิร์ต + รายได้แยก zone (ผ่าน `vw_concert_sales`)
- **Refund Approval** — review และอนุมัติ / ปฏิเสธคำขอคืนเงิน

### 🛡️ Staff
- **QR Check-in** — สแกน QR ของลูกค้าผ่านกล้อง (`jsqr`); backend ใช้ `SELECT … FOR UPDATE` กัน double check-in, validate booking=`paid` + `is_used=false`, บันทึกเข้า `ticket_checkin`

---

## 🎨 Design System — Coastal Edition

ระบบดีไซน์ภายใต้ชื่อ **"Together AI · Coastal Edition"** — premium / sophisticated concierge aesthetic

| หัวข้อ | รายละเอียด |
| --- | --- |
| **Mood & Tone** | Airy · Optimistic · Professional |
| **Primary Palette** | Sky Blue `#AAD6FA` · Cream `#FCE6A9` · Midnight `#010120` · Sky Tint `#C5F6FA` |
| **Typography** | Headlines: `The Future` (500 weight, tight tracking) · Mono labels: `PP Neue Montreal Mono` (uppercase) · Body: Inter |
| **Radii** | `8px` containers · `4px` controls (no pill shapes — sharp by intention) |
| **Shadow** | Blue-tinted soft: `rgba(1, 1, 32, 0.06) 0 4px 12px` |
| **Glassmorphism** | `backdrop-filter: blur(20px)` + `rgba(255,255,255,0.55)` บน hero / cards |
| **Gradient** | `linear-gradient(135deg, #AAD6FA, #FCE6A9)` |
| **Premium touches** | Ticket stub perforated design · floating GFX · monospace coordinate footer |

**Do:** ใช้ Midnight `#010120` เป็น anchor / Driftwood `#6f5e4e` สำหรับ metadata
**Don't:** ใช้สีดำล้วน · ใช้ pill rounded shapes

CSS tokens อยู่ใน `frontend_v2/src/styles/tokens.css`

---

## 🏗️ Technical Architecture

```
┌──────────────────────┐      HTTPS / JSON     ┌─────────────────────┐    psycopg2 sync pool   ┌──────────────────┐
│  Frontend (Vite +    │  ───────────────────► │  FastAPI Backend    │  ─────────────────────► │   PostgreSQL     │
│  TypeScript strict)  │  ◄─────────────────── │  (uvicorn / async)  │  ◄───────────────────── │   14+            │
│  Path Router · jsQR  │                       │  JWT · CORS · OAuth │                         │ 15 tables / 9 vw │
└──────────────────────┘                       └─────────────────────┘                         └──────────────────┘
                                                          │
                                                          ▼
                                                ┌────────────────────┐
                                                │ Background Task    │
                                                │ Expiry loop (60s)  │
                                                │ pending → expired  │
                                                │ + cascade revert   │
                                                └────────────────────┘
```

### หลักการสถาปัตยกรรม

- **Decoupled Frontend / Backend** — frontend เป็น static site (Vite build), backend เปิด REST API
- **Path-based Router (no hash)** — hand-rolled router ใน `frontend_v2/src/router.ts`; `router.register({ path, handler })` map path → view; `requireAuth(role?)` guard ห่อทุก handler
- **Stateless JWT** — `routes/auth.py` ออก HS256 token (TTL จาก `JWT_EXPIRE_MINUTES`); frontend เก็บใน `authStore` (localStorage); 401 ใด ๆ จะเคลียร์ store + emit `auth:logout`
- **Connection Pooling** — `psycopg2.pool.SimpleConnectionPool` (min 1, max 10) ใน `models.py`; ทุก route ใช้ `get_db_connection()` context manager
- **OAuth** — Line + Google ทั้งสองทำงานครบ flow (authorize URL → callback → token exchange → user upsert)
- **Payment Webhook Security** — ตรวจ `X-Signature` ด้วย HMAC-SHA256 + `hmac.compare_digest()` (constant-time)

### Concurrency & Transaction Safety

หัวใจของระบบ — แก้ปัญหา race condition ที่ classic ของ ticketing:

1. **Seat soft-lock** — ใน `routes/booking.py` การจองทำใน transaction เดียว: `SELECT … FOR UPDATE` ที่นั่งเป้าหมาย → ถ้า status = `available` → flip เป็น `locked` → insert `booking` (status `pending`) + `ticket` ทุก seat → commit
2. **Idempotent payment webhook** — `WHERE status='pending'` + UNIQUE(`transaction_ref`) ทำให้ retry ของ gateway ไม่สร้าง state ซ้ำ
3. **Background expiry cascade** — `_expire_bookings_loop()` ใน `app.py` รันทุก 60 วินาที:
   - `booking` ที่ `status='pending'` และเลย `expired_at` → `expired`
   - `seat` ที่ผูกกับ booking นั้น → คืนกลับ `available`
   - `queue_session` ที่ `admitted` → `expired`
   - `payment` ที่ `pending` → `expired`
4. **Check-in dedup** — `staff.py` ใช้ `SELECT … FOR UPDATE` + UNIQUE(`ticket_id`) บน `ticket_checkin` กัน scan ซ้ำ
5. **Refund idempotency** — UNIQUE(`payment_id`) บน `refund` + `ON CONFLICT DO NOTHING`

### Routers (FastAPI)

| Prefix | ไฟล์ | หน้าที่ |
| --- | --- | --- |
| `/auth` | `routes/auth.py` | register · login (SHA-256) · OAuth Line/Google · `/me` · `PATCH /profiles` · forgot-password |
| `/booking` | `routes/booking.py` | concert list · queue join/status · zones · seats · `POST /book` (transactional soft-lock) · `/my` · ticket QR fetch |
| `/organizer` | `routes/organizer.py` | concert CRUD + soft-delete · zone diff · queue admit / priority override · sales reporting |
| `/api/v1/payments` | `routes/payment.py` | `generate-qr` (PromptPay) · `status/{ref}` (poll) · `webhook` (HMAC verified) |
| `/api/v1/refunds` | `routes/refund.py` | `request` (7-day full refund) · `voucher/{booking_id}` (zone-closure) |
| `/staff` | `routes/staff.py` | `verify-ticket` (QR scan check-in) |


ดู API contract เต็ม: [`routes/FRONTEND_API_GUIDE.md`](./routes/FRONTEND_API_GUIDE.md) · Swagger: `http://localhost:8000/docs`

---

## 🛠️ Tech Stack

### Frontend (`frontend_v2/`)
- **Vite 5** + **TypeScript 5.4 strict** (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- **Vanilla DOM** — ไม่มี React / Vue; render ด้วย `el()` helper ใน `utils/dom.ts`
- **Tailwind CSS 3.4** + design tokens จาก `src/styles/tokens.css`
- **jsQR 1.4** — สแกน QR code (staff check-in)
- **Custom EventBus** (`state/events.ts`) สำหรับ pub/sub — ไม่มี state framework

### Backend
- **FastAPI 0.135** + **Uvicorn 0.44**
- **psycopg2-binary 2.9** + `SimpleConnectionPool` (sync; `models.py`)
- **PyJWT 2.12** สำหรับ JWT HS256
- **Pydantic 2.12** + **pydantic-settings**
- **Alembic 1.18** สำหรับ DB migrations (`database/migrations/`)
- **python-multipart** สำหรับ file upload (concert poster)
- **python-dotenv** อ่าน `.env`

### Database
- **PostgreSQL 14+**
- **15 tables · 9 views · 14 indexes** — รายละเอียดด้านล่าง

---

## 🗄️ Database Schema

ดูไฟล์เต็ม: [`database/schema.sql`](./database/schema.sql) · ER diagram: [`database/update_ERD.png`](./database/update_ERD.png) · Sample queries: [`queries.sql`](./queries.sql)

### 3NF Compliance

Schema ออกแบบเป็น **Third Normal Form** อย่างจงใจ:

- **ไม่มี role-specific column บน `users`** — ทุกอย่างเฉพาะ role อยู่ใน `customer_profile` / `organizer_profile` / `staff_profile` (FK กลับมา)
- **ไม่มี repeating group** — seat / payment / refund / check-in เป็น atomic record
- **ไม่มี transitive dependency** — `payment` อ้างถึง `booking` (ไม่ข้ามไป customer); `refund` อ้างถึง `payment` (ไม่ข้ามไป booking)

### Tables (15)

| กลุ่ม | Table | หน้าที่ |
| --- | --- | --- |
| **Identity** | `users` | บัญชีกลาง (email/id_card unique, role: customer/organizer/staff) |
|  | `social_account` | OAuth mapping (line / google / facebook / email) |
|  | `customer_profile` | ข้อมูลลูกค้า + `location_score` สำหรับ priority queue |
|  | `organizer_profile` | ผู้จัด (tax_id, company_name) |
|  | `staff_profile` | สังกัด organizer + shift + `staff_code` |
| **Catalog** | `concert` | คอนเสิร์ต (sale window, status, image_url) |
|  | `zone` | โซน (price, total_seats, min_booking_threshold) |
|  | `seat` | ที่นั่งรายตัว (status: available/locked/sold/closed) |
| **Pipeline** | `queue_session` | คิว (priority_score, entered_at, status) |
|  | `booking` | การจอง (7 statuses incl. `zone_closed_action_required`, `refund_pending`) |
|  | `ticket` | ตั๋วต่อที่นั่ง (UNIQUE seat_id กัน double-book; `qr_hash`, `is_used`) |
|  | `ticket_checkin` | บันทึก check-in (UNIQUE ticket_id) |
| **Money** | `payment` | การชำระเงิน (qr_code/credit_card/bank_transfer; UNIQUE `transaction_ref`) |
|  | `refund` | คำขอคืนเงิน (UNIQUE payment_id; รองรับ bank transfer + voucher) |
|  | `finance` | Audit ledger (income/expense/refund/payout) |

### Views (9) — รองรับ reporting & UI

`vw_booking_summary` · `vw_ticket_detail` · `vw_available_seat` · `vw_payment_status` · `vw_concert_sales` · `vw_expired_bookings` · `vw_queue_status` · `vw_refund_status` · `vw_checkin_status`

### Critical Indexes

- `idx_queue_priority_score (concert_id, priority_score DESC, entered_at ASC)` — เร่งการ admit คิว
- `idx_seat_zone_status` — เช็คที่นั่งว่างใน zone
- `idx_booking_expired_pending` (partial, `WHERE status='pending'`) — ใช้โดย background expiry
- `idx_ticket_qr_hash` — gate scan O(log n)

### State Machines

| Entity | States |
| --- | --- |
| `concert` | draft → on_sale → closed / cancelled |
| `seat` | available → locked → sold / closed |
| `queue_session` | waiting → admitted → completed / expired |
| `booking` | pending → paid / cancelled / expired / zone_closed_action_required → refund_pending → refunded |
| `payment` | pending → paid / failed / expired |
| `refund` | pending_transfer → requested → approved → processing → completed / rejected |

---

## 📂 Project Structure

```
CN230_tooket-ther/
├── app.py                       # FastAPI entry + lifespan + expiry loop
├── config.py                    # Env-driven Config class
├── models.py                    # psycopg2 SimpleConnectionPool wrapper
├── requirements.txt
├── queries.sql                  # Sample / analytic queries
├── routes/
│   ├── auth.py                  # /auth — register, login, OAuth, /me
│   ├── booking.py               # /booking — queue, seats, transactional booking
│   ├── organizer.py             # /organizer — concert CRUD, queue admit
│   ├── payment.py               # /api/v1/payments — PromptPay + webhook
│   ├── refund.py                # /api/v1/refunds — 7-day + voucher
│   ├── staff.py                 # /staff — QR check-in
│   ├── deps.py                  # CurrentUser dependency
│   └── FRONTEND_API_GUIDE.md
├── database/
│   ├── schema.sql               # 15 tables · 9 views · 14 indexes
│   ├── seed.sql                 # Sample data
│   ├── migrations/              # Alembic
│   ├── image/                   # Uploaded concert posters (served as static)
│   └── update_ERD.png
├── frontend_v2/                 # Active frontend
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts           # Proxies to 127.0.0.1:5000 (see warning below)
│   └── src/
│       ├── main.ts              # Entry, route registration, auth guards
│       ├── router.ts            # Hand-rolled path-based router
│       ├── styles/              # tokens.css, base.css, components.css
│       ├── api/                 # client.ts + per-domain endpoint modules
│       ├── state/               # authStore, EventBus
│       ├── views/               # render*View() per route
│       ├── components/          # header, modals, seat grid
│       └── utils/               # el(), dom helpers, formatters
├── CLAUDE.md
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
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Environment variables

```bash
cp .env.example .env
```

Keys หลัก:

| Key | คำอธิบาย |
| --- | --- |
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/tookettherdb` |
| `SECRET_KEY` / `JWT_SECRET_KEY` | Random string สำหรับเซ็น JWT (HS256) |
| `JWT_EXPIRE_MINUTES` | อายุ token (default 60) |
| `LINE_CLIENT_ID` / `LINE_CLIENT_SECRET` | OAuth Line (optional) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth Google (optional) |
| `PAYMENT_WEBHOOK_SECRET` | Shared HMAC-SHA256 secret กับ payment gateway |
| `PROMPTPAY_ID` | เบอร์มือถือ / เลขบัตรประชาชน สำหรับ QR PromptPay |
| `PORT` | Default `8000` |
| `APP_DEBUG` | `true` เปิด auto-reload |

### 4. Database bootstrap

```bash
createdb tookettherdb
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
# → http://localhost:5173
```

> ⚠️ **Port mismatch warning** — `frontend_v2/vite.config.ts` proxy ตรงไปที่ **`http://127.0.0.1:5000`** (ไม่มี `/api` umbrella; แต่ละ prefix `/auth` `/booking` `/organizer` `/staff` `/payment` `/refund` `/database/image` `/health` ถูก proxy แยก) — ในขณะที่ backend default คือ port `8000` (`config.py`).
> เวลา dev end-to-end ให้เลือกอย่างใดอย่างหนึ่ง:
> 1. รัน FastAPI ที่ `:5000` (เช่น `PORT=5000 python app.py`) — ไม่ต้องแก้ config, **แนะนำ**
> 2. แก้ proxy target ใน `vite.config.ts` ให้ชี้ `:8000`

---

## 📜 Available Scripts

### Backend
| คำสั่ง | หน้าที่ |
| --- | --- |
| `python app.py` | รัน FastAPI + uvicorn (reload เมื่อ `APP_DEBUG=true`) |
| `uvicorn app:app --reload --port 8000` | ทางเลือก |
| `alembic upgrade head` | รัน migrations |
| `ruff check .` | Lint |

### Frontend (`cd frontend_v2`)
| คำสั่ง | หน้าที่ |
| --- | --- |
| `npm run dev` | Vite dev server (port 5173) |
| `npm run build` | typecheck + production build → `dist/` |
| `npm run typecheck` | `tsc --noEmit` strict |
| `npm run preview` | preview production build |

---

## 📚 API Documentation

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`
- **Frontend Contract:** [`routes/FRONTEND_API_GUIDE.md`](./routes/FRONTEND_API_GUIDE.md) — endpoint + payload ที่ frontend เรียกตรง ๆ

---

## 👥 Members

| No. | Student ID | Name | Nickname |
| --- | --- | --- | --- |
| 1 | 6710545010 | นพัตธีรา เหลาเกิ้มหุ่ง | ลานนา |
| 2 | 6710615144 | ปณิธาน ตันตื้อ | กาฟิวส์ |
| 3 | 6710615243 | ลลิตา ทัศนอนันชัย | หมิว |
| 4 | 6710685055 | พัชรพล มาลัยศรี | ปิงปอง |

---

> Built for CN230 · © 2026 · *Infrastructure for Live Intelligence.*
