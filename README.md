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
