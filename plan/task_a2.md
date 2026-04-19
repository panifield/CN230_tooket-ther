# Task List — A2 Backend Core (ปณิธาน)

อ้างอิง [flow_plan.md](./flow_plan.md) · บทบาท: FastAPI backend, เชื่อม PostgreSQL, Auth, คิว, จอง/ล็อกที่นั่ง, query หลัก

---

## ไฟล์ที่รับผิดชอบหลัก

| ไฟล์ / โฟลเดอร์ | หมายเหตุ |
|-----------------|----------|
| `app.py` | entry point, register blueprint, health |
| `config.py` | env, `DATABASE_URL`, `SECRET_KEY`, `PORT`, debug |
| `models.py` | connection pool / helper เชื่อม DB (psycopg2) |
| `routes/auth.py` | login, OAuth callback, JWT |
| `routes/booking.py` | คิว, soft lock ที่นั่ง, booking flow |
| `queries.sql` | query ≥ 5 ข้อตามเกณฑ์ + คำอธิบายใน commit/PR |

ไฟล์อื่นที่อาจต้องแตะเมื่อ integrate: `requirements.txt`, `.env.example` (ประสานทีม)

---

## เงื่อนไขก่อนเริ่ม

- [ ] มี `database/schema.sql` และ `database/seed.sql` จาก A1 รันได้บนเครื่องตัวเอง
- [ ] `.env` มี `DATABASE_URL` แบบ `postgresql://...` ตรงกับ DB จริง
- [ ] รันแอปแล้ว `/health` ได้ `"database": "ok"`

---

## Phase 1 — พื้นฐาน (สัปดาห์ 1)

- [x] ตั้ง FastAPI app + APIRouter พื้นฐาน
- [x] Config จาก `.env` (`python-dotenv`)
- [x] PostgreSQL ผ่าน `psycopg2` + pool / `get_db_connection()`
- [x] Endpoint `/`, `/health` (เช็ก DB)
- [x] เริ่ม `queries.sql` ครบอย่างน้อย 5 ข้อ (อัปเดตให้ตรงชื่อคอลัมน์ใน `database/schema.sql` ถ้ามี drift)

**Definition of done:** เพื่อน clone มา ตาม `.env.example` + รัน schema/seed แล้ว `uvicorn app:app --reload` ขึ้นได้

---

## Phase 2 — Auth (สัปดาห์ 2 ต้น)

- [ ] ออกแบบ flow: Line / Facebook OAuth → callback → สร้าง/อัปเดต user ในตาราง `users`
- [ ] ออก JWT (access token) เก็บ `user_id`, `auth_provider` ตามที่ทีมตกลง
- [ ] Endpoint ตัวอย่าง: authorize URL / callback / refresh (ถ้าต้องการ)
- [ ] Middleware หรือ decorator ตรวจ JWT สำหรับ route ที่ต้อง login

**Definition of done:** login ได้จริง (หรือ mock OAuth ใน dev) และมี user row ใน DB

---

## Phase 3 — Priority & Queue (สัปดาห์ 2)

- [ ] Logic คำนวณ / sync `priority_status` จาก `domicile` (ให้สอดคล้อง constraint ใน schema เช่น 0/1)
- [ ] เข้าคิว: insert/update `queue_sessions` (priority_score, `entered_at`, status)
- [ ] API ดึงลำดับคิว / สถานะ (ORDER BY priority แล้วเวลา — สอดคล้อง Q6 ใน flow plan ถ้ามีตารางคิว)
- [ ] ประสาน A4 เรื่อง path และ response JSON ที่หน้า UI จะเรียก

**Definition of done:** user ที่ login แล้ว join queue ต่อคอนเสิร์ตได้ และ query ลำดับได้ถูกต้อง

---

## Phase 4 — Seat Soft Lock & Booking (สัปดาห์ 2–3)

- [ ] Transaction: `BEGIN` → `SELECT ... FOR UPDATE` บนแถว `seats` ที่ `available` → อัปเดตเป็น `locked`
- [ ] สร้างแถว `bookings` status `pending`, ตั้ง `expiry_time` (+15 นาที)
- [ ] ป้องกัน double booking (unique / constraint + logic ใน transaction)
- [ ] Endpoint confirm เมื่อชำระสำเร็จ (หรือ stub รอ A3 webhook) — สลับ seat → `sold`, booking → `confirmed`

**Definition of done:** สอง client พยายามจองที่นั่งเดียวกัน มีแค่คนเดียวสำเร็จ

---

## Phase 5 — Expiry / Rollback (สัปดาห์ 3)

- [ ] Job หรือ scheduled task (เช่น thread + sleep, APScheduler, หรือ cron เรียก script) รัน query แบบ Q4
- [ ] สำหรับ booking หมดเวลา: คืน `seats.status` เป็น `available`, อัปเดต `bookings` เป็น `cancelled` (หรือตามที่ทีมกำหนด)
- [ ] บันทึก log / error handling ไม่ให้ job พังแล้วค้าง transaction

**Definition of done:** จองค้างไม่จ่ายหลัง expiry ที่นั่งกลับมาว่างอัตโนมัติ

---

## Phase 6 — Queries & ส่งงาน (สัปดาห์ 3–4)

- [ ] ทบทวน `queries.sql` ให้ครบ ≥ 5 ข้อ และ **ชื่อตาราง/คอลัมน์ตรง `database/schema.sql`** (เช่น `min_threshold` vs `threshold` ถ้าเคยเปลี่ยน)
- [ ] แต่ละ query มีคอมเมนต์สั้นๆ ว่าใช้ทำอะไร (JOIN / GROUP BY / subquery / HAVING ฯลฯ)
- [ ] Integration test แบบ manual หรือ pytest กับ DB (ถ้าทีมมีแนวทาง)
- [ ] ประสาน A3: เส้นทาง booking → payment; A4: template เรียก API

**Definition of done:** rubric query + CRUD path หลักผ่าน review ทีม

---

## Checklist ก่อน merge / demo

- [ ] ไม่ commit `.env` จริง
- [ ] `.env.example` อธิบายตัวแปรที่ backend ใช้
- [ ] `pip install -r requirements.txt` ติดตั้งได้บนเครื่องสะอาด
- [ ] มีวิธีรัน + เช็ก `/health` สั้นๆ ใน PR หรือคอมเมนต์

---

## จุดประสานทีม

| คน | เรื่อง |
|----|--------|
| A1 | DDL เปลี่ยน → แจ้ง A2 อัปเดต query / model |
| A3 | payment webhook, อัปเดต booking/seat หลังจ่าย |
| A4 | URL หน้า, รูปแบบ JSON, CORS ถ้ามีแยก origin |

---

*อัปเดตล่าสุดตาม flow plan กลุ่ม Tooket-ther*
