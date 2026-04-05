# CN230_tooket-ther 
Website for booking tickets for concerts

##  Project Description
CN230_tooket-ther is a web application developed for booking concert tickets.  
Users can browse concerts, select seats, and make reservations بسهولةผ่านระบบออนไลน์.

##  Features
-  Browse available concerts
-  Select seats
-  Book tickets
-  User-friendly interface

##  Technologies Used
- Frontend: 
- Backend: 
- Database: 

## Members
| No. | Student ID | Name | Nickname |
|-----|----------|------|----------|
| 1 | 6710545010 | นพัตธีรา เหลาเกิ้มหุ่ง | ลานนา |
| 2 | 6710615144 | ปณิธาน ตันตื้อ | กาฟิวส์ |
| 3 | 6710615243 | ลลิตา ทัศนอนันชัย | หมิว |
| 4 | 6710685055 | พัชรพล มาลัยศรี | ปิงปอง |

## 📂 Project Structure
# Tooket-ther (CN230)

Backend สำหรับแพลตฟอร์มจองบัตรคอนเสิร์ต — ออกแบบตาม [design_plan.md](./design_plan.md) และ [plan.md](./plan.md)

## ความต้องการ

- Python 3.12+
- PostgreSQL 16+ และ Redis 7+ (แนะนำรันผ่าน Docker Compose)

## ติดตั้งและรัน API (local)

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e .

cp .env.example .env
docker compose up -d postgres redis

alembic upgrade head
uvicorn tooket_ther.app.main:app --reload --host 0.0.0.0 --port 8000
```

- Health: <http://127.0.0.1:8000/health>
- OpenAPI: <http://127.0.0.1:8000/docs>

### Phase 1 — Auth & คิว

- `GET /api/v1/auth/oauth/{line|facebook}/authorize-url` — สร้างลิงก์ login (ส่ง `state` และ optional `redirect_uri`)
- `POST /api/v1/auth/oauth/token` — แลก `code` → access JWT
- `POST /api/v1/concerts/{id}/queue/join` — Header `Authorization: Bearer <access_token>`
- `GET /api/v1/concerts/{id}/queue/status`
- `POST /api/v1/concerts/{id}/queue/admit` — ได้ **admission JWT** (สั้น, ใช้ Phase 2 ตอนเลือกที่นั่ง)

## ตัวแปรสภาพแวดล้อม

ดู `.env.example` — `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET_KEY`, และค่า OAuth (Line/Facebook)

## Migration

```bash
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

- `001_initial_schema` — ตารางหลัก (รวม `organizer_ledger_entries`)
- `002_host_country` — `concerts.host_country_code` สำหรับ priority แบบ MVP

---

## 🐳 รัน Postgres + Redis ด้วย Docker Compose (T6.4)

ไฟล์ `docker-compose.yml` ในโปรเจกต์นี้รวม 2 services ครับ:
- **`postgres`** — PostgreSQL 16 Alpine (port `5432`)
- **`redis`** — Redis 7 Alpine (port `6379`)

### วิธีรัน

```bash
# 1. คัดลอกค่า environment
cp .env.example .env

# 2. รัน infrastructure ทั้งคู่
docker compose up -d postgres redis

# 3. ตรวจสอบว่า containers รันอยู่
docker compose ps

# 4. Migrate ฐานข้อมูล
source .venv/bin/activate
alembic upgrade head

# 5. รัน server
uvicorn tooket_ther.app.main:app --reload --port 8000
```

### หยุดและลบข้อมูล

```bash
# หยุด containers (เก็บข้อมูล)
docker compose stop

# หยุดและลบ volumes ด้วย (รีเซ็ต DB ทั้งหมด)
docker compose down -v
```

---

## 🧪 รันทดสอบ (T6.1 / T6.2)

```bash
# Unit tests (ไม่ต้องใช้ DB)
pytest tests/unit -v

# Integration tests (ต้องรัน Postgres และมีข้อมูล seed ก่อน)
pytest tests/integration -v

# รันทั้งหมด
pytest
```

---

## 📡 API Endpoints สรุปทุก Phase

| Role | Method | Path | คำอธิบาย |
|------|--------|------|----------|
| — | `GET` | `/health` | Health check |
| User | `GET` | `/api/v1/auth/oauth/{provider}/authorize-url` | สร้าง OAuth login URL |
| User | `GET` | `/api/v1/auth/oauth/{provider}/callback` | แลก code → JWT |
| User | `POST` | `/api/v1/queue/concerts/{id}/join` | เข้าคิว |
| User | `GET` | `/api/v1/queue/concerts/{id}/status` | ดูสถานะคิว |
| User | `POST` | `/api/v1/queue/concerts/{id}/admit` | รับ Admission Token |
| User | `POST` | `/api/v1/bookings` | จองที่นั่ง |
| User | `POST` | `/api/v1/payments/bookings/{id}` | สร้าง QR ชำระเงิน |
| System | `POST` | `/api/v1/payments/webhook` | รับ Webhook จาก Gateway |
| User | `POST` | `/api/v1/bookings/{id}/refund` | ยื่นขอคืนเงิน |
| Organizer | `POST` | `/api/v1/organizer/refunds/{id}/approve` | อนุมัติคืนเงิน |
| Organizer | `POST` | `/api/v1/organizer/zones/{id}/close` | ปิดโซน |
| Organizer | `POST` | `/api/v1/organizer/bookings/{id}/move` | ย้ายที่นั่ง (Free Upgrade) |
| Checker | `POST` | `/api/v1/checker/checkin` | สแกน QR เข้างาน |
| Organizer | `GET` | `/api/v1/reports/concerts/{id}/financials` | รายงานการเงิน |
| Organizer | `GET` | `/api/v1/reports/concerts/{id}/zones` | สถิติการขายต่อโซน |
