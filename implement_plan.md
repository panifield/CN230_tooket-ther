# CN230 Tooket-Ther: Implementation Plan (Python + PostgreSQL)

## 1) เป้าหมายโครงงานและกรอบการพัฒนา
- โครงงานนี้พัฒนาเป็นระบบจองบัตรคอนเสิร์ต (Concert Ticketing) โดยใช้ `Python` ฝั่ง Backend และ `PostgreSQL` เป็นฐานข้อมูลหลัก
- เป้าหมายคือทำระบบที่เชื่อมโยงข้อมูลจริงครบวงจร: ผู้ใช้, คอนเสิร์ต, ที่นั่ง/คิว, การจอง, การชำระเงิน, การเช็กอิน และรายงาน
- การส่งมอบจะอิงตามเกณฑ์ `Project.pdf` โดยจัดงานให้ครบ 6 ส่วน: วิเคราะห์ระบบ, ออกแบบฐานข้อมูล, พัฒนาฐานข้อมูล, Query/Business Logic, Interface, รายงาน/นำเสนอ

## 2) Flow การทำงานของระบบ (End-to-End)

### 2.1 ภาพรวมสถาปัตยกรรม
- Client (Web/App) เรียก API ที่เขียนด้วย Python
- Backend ทำ Business Logic และทำธุรกรรมข้อมูลกับ PostgreSQL
- PostgreSQL รับผิดชอบความถูกต้องของข้อมูลผ่าน PK/FK/UNIQUE/CHECK/NOT NULL + Transaction
- มีสคริปต์ seed และ migration เพื่อรันซ้ำได้ในทุกเครื่อง

### 2.2 Main Operational Flow
1. ผู้ใช้สมัคร/ล็อกอิน
   - สร้างบัญชีผู้ใช้ หรือเข้าสู่ระบบ
   - Backend ออก token/session เพื่อใช้เรียก API ถัดไป
2. ค้นหาและดูรายละเอียดคอนเสิร์ต
   - อ่านข้อมูลคอนเสิร์ต, รอบการแสดง, ราคา, โซนที่นั่ง, สถานะขาย
3. เข้าคิว/เลือกที่นั่ง
   - กรณีคอนเสิร์ตยอดนิยม: ผู้ใช้เข้าคิวก่อน
   - เมื่อถึงสิทธิ์จอง ผู้ใช้เลือกที่นั่งและระบบทำ hold ชั่วคราว
4. สร้างการจอง (Booking)
   - Backend ตรวจสอบความว่างของที่นั่งแบบ transaction-safe
   - บันทึกข้อมูลการจอง + รายการที่นั่ง + ราคารวม
5. ชำระเงิน
   - ระบบรับผลชำระเงิน (สำเร็จ/ล้มเหลว/หมดเวลา)
   - ถ้าสำเร็จ: อัปเดตสถานะ booking เป็น paid และล็อกที่นั่งถาวร
   - ถ้าล้มเหลวหรือ timeout: ปล่อย hold และคืนสิทธิ์ที่นั่ง
6. ออกบัตร/เช็กอินหน้างาน
   - สร้าง ticket code/QR
   - เจ้าหน้าที่เช็กอิน เปลี่ยนสถานะบัตรเป็น used
7. คืนเงิน (ถ้ามีนโยบายรองรับ)
   - ตรวจสอบเงื่อนไขเวลาและประเภทบัตร
   - ทำรายการคืนเงินและอัปเดตสถานะ booking/payment/ticket
8. รายงานฝั่งผู้จัด
   - สรุปยอดขาย, occupancy rate, จำนวนเช็กอิน, รายได้แยกคอนเสิร์ต

### 2.3 Data Consistency Flow ที่ต้องมีใน PostgreSQL
- ใช้ transaction ทุกจุดวิกฤต: จองที่นั่ง, ชำระเงิน, คืนเงิน, เช็กอิน
- กันจองที่นั่งซ้ำด้วย unique constraint (เช่น concert_id + seat_id)
- ใช้ row locking/`SELECT ... FOR UPDATE` ในขั้นตอน hold/confirm ที่นั่ง
- ทำ soft delete หรือสถานะเชิงธุรกิจแทนการลบจริงในตารางสำคัญ
- เก็บ audit fields (`created_at`, `updated_at`, `created_by`) ทุกตารางหลัก

## 3) โครงสร้างข้อมูลหลัก (Logical Scope)
- `users` (ผู้ซื้อ, ผู้จัด, checker, admin)
- `concerts` และข้อมูลรอบ/สถานที่
- `seats` หรือ `seat_zones` + pricing
- `queues` (กรณีคิวรอซื้อ)
- `bookings` และ `booking_items`
- `payments` และ payment transaction log
- `tickets` และสถานะเช็กอิน
- `refunds`
- `ledger` หรือ summary table เพื่อช่วยรายงาน

หมายเหตุ: ตอนทำ ERD ให้ระบุ cardinality ชัดเจน (1:N, M:N) และ mapping เป็น relational schema พร้อม PK/FK ตามเกณฑ์งาน

## 4) แผนแบ่งงาน 4 คน (Role-based + Deliverables)

### สมาชิก A: Database Architect & Migration Owner
**รับผิดชอบหลัก**
- ทำ ERD/UML + relational schema + normalization rationale
- ออกแบบ constraint/index/view ที่จำเป็น
- ดูแล migration versioning และ seed data ชุดมาตรฐาน

**ผลลัพธ์ที่ต้องส่ง**
- `docs/erd.*`
- `sql/ddl/*.sql`, `sql/dml/*.sql`
- `migrations/*` และ `scripts/seed_data.*`

### สมาชิก B: Backend Core API (Python) Owner
**รับผิดชอบหลัก**
- พัฒนา API แกนหลัก: auth, concerts, bookings
- ออกแบบ service/repository layer ให้แยก logic ชัดเจน
- เชื่อม DB transaction กับ flow จอง/ยืนยันการจอง

**ผลลัพธ์ที่ต้องส่ง**
- โมดูล API + service + repository ฝั่ง Python
- ชุด unit/integration test ส่วน booking flow

### สมาชิก C: Payment/Queue/Check-in Owner
**รับผิดชอบหลัก**
- พัฒนา flow คิว, payment callback, ticket issue, checker check-in
- ดูแล state transition และ idempotency ในจุด callback
- ทำ query/endpoint สำหรับ operational monitoring

**ผลลัพธ์ที่ต้องส่ง**
- API ชุด queue/payment/checker
- test กรณี concurrency และ payment state

### สมาชิก D: Frontend + Reporting & QA Owner
**รับผิดชอบหลัก**
- พัฒนา UI ที่ใช้งานได้จริงแบบ CRUD ตามข้อมูลหลัก
- ต่อ API ครบ flow: ดูคอนเสิร์ต, จอง, ชำระเงิน, ดูตั๋ว
- ทำรายงาน query 5+ รายการตาม rubric และเตรียม demo script

**ผลลัพธ์ที่ต้องส่ง**
- หน้าจอฝั่งผู้ใช้/ผู้จัด/checker
- SQL/query docs และภาพผลลัพธ์สำหรับรายงาน

## 5) วิธีเชื่อมงานจากทั้ง 4 คน (Integration Strategy)

### 5.1 Git Workflow
- ใช้ branch strategy:
  - `main` = stable demo-ready
  - `develop` = integration branch
  - `feature/<scope>` ต่อคน
- ทุกงานเข้า `develop` ผ่าน Pull Request เท่านั้น
- ต้องมี code review อย่างน้อย 1 คนก่อน merge
- ห้าม push ตรงเข้า `main`

### 5.2 Database Version Control
- ใช้ migration เป็น single source of truth ของ schema
- ตั้งกติกา migration:
  - 1 feature = 1 migration ชัดเจน
  - ชื่อ migration สื่อความหมาย
  - มี rollback/down script (ถ้า framework รองรับ)
- CI ต้องรัน: create DB -> apply migration -> seed -> run tests

### 5.3 Environment มาตรฐานร่วมกัน
- กำหนดไฟล์กลาง: `.env.example` (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, JWT_SECRET ฯลฯ)
- ใช้ `docker compose` สำหรับ PostgreSQL dev environment เดียวกัน
- ทุกคนใช้ seed data ชุดเดียวกัน เพื่อลดปัญหา query/test ไม่ตรงกัน

### 5.4 API Contract First
- กำหนด endpoint contract กลาง (request/response/status code) ก่อนลงมือแยกงาน
- ทำเอกสาร API (เช่น markdown/openapi) และ lock version ระหว่าง sprint
- เมื่อมี breaking change ต้องประกาศใน PR และอัปเดตทุกฝั่งพร้อมกัน

### 5.5 Test & Quality Gate
- ขั้นต่ำก่อน merge:
  - migration ผ่าน
  - unit test ผ่าน
  - integration test flow หลักผ่าน (booking/payment/check-in)
  - lint/format ผ่าน
- เพิ่ม test จุดเสี่ยง:
  - จองที่นั่งพร้อมกันหลายคน
  - payment callback ซ้ำ
  - timeout hold แล้วปล่อยที่นั่งถูกต้อง

## 6) Roadmap การทำงาน (แนะนำ 4 สัปดาห์)

### สัปดาห์ที่ 1: Analysis + Database Design
- เก็บ requirements, stakeholders, use cases, functional requirements (>=5)
- ทำ ERD + relational schema + normalization
- สร้าง migration เริ่มต้นและ seed ชุดแรก

### สัปดาห์ที่ 2: Core Backend + CRUD Interface
- ทำ auth/concert/booking API
- ทำหน้าจอ CRUD ข้อมูลหลัก
- เริ่ม integration test flow พื้นฐาน

### สัปดาห์ที่ 3: Advanced Business Flow
- ทำ queue, payment, ticket, checker, refund
- ปรับ index และ query performance ขั้นต้น
- สร้าง query สำคัญ 5+ รายการสำหรับรายงาน

### สัปดาห์ที่ 4: Integration Hardening + Final Demo
- เก็บ bug, ทดสอบ end-to-end, เตรียมข้อมูลเดโม
- สรุปรายงาน PDF และวิดีโอเดโม
- ซ้อมนำเสนอให้สมาชิกทุกคนตอบคำถามได้

## 7) Mapping งานกับเกณฑ์คะแนน
- 10% วิเคราะห์ระบบ: stakeholders/use case/functional requirements ครบ
- 25% ออกแบบฐานข้อมูล: ERD + schema + key + normalization + assumptions
- 25% พัฒนาฐานข้อมูล: DDL/DML/constraints/index/view + run ซ้ำได้
- 20% Query/Business logic: query ขั้นสูง 5+ พร้อมคำอธิบายการใช้งานจริง
- 10% Interface: CRUD ครบและเชื่อม DB จริง
- 10% รายงาน/นำเสนอ: เอกสารครบ + demo ได้จริง + สมาชิกมีส่วนร่วมครบ

## 8) รายการส่งมอบขั้นต่ำ (Checklist)
- [ ] GitHub repo พร้อม README วิธีติดตั้ง/รัน + รายชื่อสมาชิก
- [ ] SQL/migration + seed ที่รันซ้ำได้
- [ ] ERD/UML และ relational schema
- [ ] Query สำคัญอย่างน้อย 5 คำสั่ง พร้อมคำอธิบาย
- [ ] Interface ที่ CRUD ได้จริง
- [ ] รายงาน PDF + วิดีโอเดโม + สไลด์นำเสนอ

## 9) ความเสี่ยงและวิธีลดความเสี่ยง
- ความเสี่ยง schema เปลี่ยนกลางทาง -> บังคับใช้ migration review
- ความเสี่ยงงานชนกัน -> ใช้ API contract + branch per feature
- ความเสี่ยงเดโมล่ม -> freeze feature ก่อนเดโม 3-5 วัน และเน้นแก้บั๊ก
- ความเสี่ยงข้อมูลไม่พอทดสอบ -> เตรียม seed data หลาย scenario ตั้งแต่ต้น

---
แผนนี้ออกแบบให้สอดคล้องกับเกณฑ์คะแนนใน `Project.pdf` และเหมาะกับทีม 4 คนที่พัฒนาด้วย Python + PostgreSQL โดยเน้นการรวมงานแบบเป็นระบบและเดโมได้จริงในวัน Final.
