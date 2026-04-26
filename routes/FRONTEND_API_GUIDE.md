# Frontend API Integration Guide — Tooket-ther

เอกสารสำหรับทีม Frontend ใช้ integrate กับ Backend API ของระบบจองคอนเสิร์ต Tooket-ther

## ภาพรวม

- Base URL (dev): `http://localhost:8000`
- Auth: ใช้ **JWT Bearer Token** ในทุก endpoint ที่ต้องล็อกอิน ส่งผ่าน header: `Authorization: Bearer <token>`
- JWT token ได้จากการ login ภายใน payload จะบอก `role` เป็น `customer` / `organizer` / `staff`
- ทุก response ที่ error จะอยู่ในรูปแบบ: `{ "detail": "ข้อความ error" }`
- วันที่-เวลาใน response เป็น ISO 8601 format (UTC timezone)
- จำนวนเงินอาจอยู่ในรูป string `"1234.00"` (2 ตำแหน่ง) หรือ number — ดูแต่ละ endpoint

---

## สารบัญ

1. [Auth APIs](#1-auth-apis) — `routes/auth.py` (prefix `/auth`)
2. [Booking / Queue / Seat APIs](#2-booking--queue--seat-apis) — `routes/booking.py` (prefix `/booking`)
3. [Organizer APIs](#3-organizer-apis) — `routes/organizer.py` (prefix `/organizer`)
4. [Payment APIs](#4-payment-apis) — `routes/payment.py` (prefix `/api/v1/payments`)
5. [Refund APIs](#5-refund-apis) — `routes/refund.py` (prefix `/api/v1/refunds`)
6. [Staff APIs](#6-staff-apis) — `routes/staff.py` (prefix `/staff`)

---

## 1. Auth APIs

### 1.1 `GET /auth/health`

**Description:** Health check ของ auth service — ใช้ debug

**Auth:** ไม่ต้อง

**Response 200:**
```json
{ "service": "auth", "status": "ok" }
```

---

### 1.2 `POST /auth/register`

**Description:** สมัครสมาชิกใหม่ (email + password)

**Auth:** ไม่ต้อง

**Request body:**
```json
{
  "id_card": "1100100123456",
  "name": "Full Name",
  "email": "user@example.com",
  "phone": "0812345678",
  "address": "Bangkok",
  "password": "Password123",
  "role": "customer"
}
```
- `role`: `customer` (default) / `organizer` / `staff`
- `id_card` ต้อง unique ในระบบ (constraint จาก `users.id_card`)

**Response 201:**
```json
{ "message": "สมัครสมาชิกสำเร็จ", "user_id": 42 }
```

**Errors:**
- `400` — email หรือ id_card ซ้ำในระบบ / role ไม่ถูกต้อง
- `422` — payload ไม่ครบ / email format ผิด

---

### 1.3 `POST /auth/login`

**Description:** Login ด้วย email + password → ได้ JWT token

**Auth:** ไม่ต้อง

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Response 200:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user_id": 42,
  "role": "customer"
}
```

Frontend ควรเก็บ `access_token` ใน localStorage และ attach `Authorization: Bearer <token>` ทุก request หลังจากนี้

**Errors:**
- `401` — email หรือ password ไม่ถูกต้อง
- `422` — payload ไม่ถูก format

---

### 1.4 `GET /auth/oauth/{provider}/authorize-url`

**Description:** สร้าง URL สำหรับ redirect ไปหน้า Login ของ Provider (Line / Google)

**Auth:** ไม่ต้อง

**Path params:** `provider` ∈ `line` / `google`

**Query params:** `state` (string, default `"tooket-state"`) — ใช้ตรวจสอบ CSRF เมื่อ callback กลับมา

**Response 200:**
```json
{
  "provider": "google",
  "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth?response_type=code&..."
}
```

Frontend ใช้ `window.location.href = authorize_url` เพื่อพาผู้ใช้ไปหน้า OAuth

**Errors:**
- `400` — provider ไม่รองรับ (รองรับเฉพาะ `line`, `google`)

---

### 1.5 `GET /auth/oauth/{provider}/callback`

**Description:** รับ `code` จาก OAuth provider → แลก token → ดึง profile → ออก JWT
ปกติ provider จะ redirect มา endpoint นี้พร้อม query params `code` + `state`

**Auth:** ไม่ต้อง

**Path params:** `provider` ∈ `line` / `google`

**Query params:**
- `code` (string, required) — authorization code จาก provider
- `state` (string) — ค่าที่ส่งไปตอน authorize-url

**Response 200:**
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "user_id": 51,
  "display_name": "Somchai J."
}
```

ถ้า user ใหม่ระบบจะสร้าง `users` row + `social_account` + `customer_profile` ให้อัตโนมัติ

**Errors:**
- `400` — provider ไม่รองรับ
- `502` — แลก token / ดึง profile ไม่สำเร็จ

---

### 1.6 `GET /auth/me`

**Description:** ดูข้อมูล user ที่ login อยู่ (ใช้เช็ค token ยัง valid + ดึง role/profile_id)

**Auth:** ทุก role

**Response 200:**
```json
{
  "user_id": 42,
  "role": "customer",
  "customer_profile_id": 17,
  "organizer_profile_id": null,
  "staff_profile_id": null,
  "name": "Somchai J.",
  "email": "somchai@example.com"
}
```

Field ที่อยู่ใน response มาจาก JWT decode + DB lookup ผ่าน `routes/deps.py:CurrentUser`
Frontend ใช้ `customer_profile_id` / `organizer_profile_id` / `staff_profile_id` เพื่อ branch UI

**Errors:**
- `401` — token หมดอายุหรือไม่ถูกต้อง

---

### 1.7 `PATCH /auth/profiles`

**Description:** แก้ไขข้อมูลส่วนตัวของ user ปัจจุบัน

**Auth:** ทุก role

**Request body:** (ทุก field optional — ส่งเฉพาะที่อยากแก้)
```json
{
  "name": "ชื่อใหม่",
  "phone": "0899999999",
  "address": "ที่อยู่ใหม่",
  "id_card": "1100100123456"
}
```

**Response 200:**
```json
{ "message": "แก้ไขข้อมูลสำเร็จ" }
```
ถ้าไม่มี field ใดส่งมา → `{ "message": "ไม่มีข้อมูลที่ต้องการแก้ไข" }`

**Errors:**
- `401` — ไม่ได้ login

---

### 1.8 `POST /auth/forgot-password`

**Description:** เปลี่ยนรหัสผ่านโดยใช้ email + id_card ยืนยันตัวตน (mode dev — production ต้อง email link)

**Auth:** ไม่ต้อง

**Request body:**
```json
{
  "email": "user@example.com",
  "id_card": "1100100123456",
  "new_password": "NewPassword123"
}
```

**Response 200:**
```json
{ "message": "เปลี่ยนรหัสผ่านสำเร็จแล้ว" }
```

**Errors:**
- `404` — email + id_card ไม่ตรงกับ user ใด ๆ ในระบบ

---

## 2. Booking / Queue / Seat APIs

### 2.1 `GET /booking/health`

**Description:** Health check ของ booking service — ไม่ต้องล็อกอิน ใช้ debug อย่างเดียว

**Auth:** ไม่ต้อง

**Response 200:**
```json
{ "service": "booking", "status": "ok" }
```

---

### 2.2 `GET /booking/concerts`

**Description:** ดึงรายการคอนเสิร์ตทั้งหมดมาแสดงในหน้าแรก / หน้า Browse
เรียกตอนเปิดหน้า Home หรือ Concert List

**Auth:** ไม่ต้อง (public)

**Response 200:** (array)
```json
[
  {
    "concert_id": 1,
    "title": "Together Live 2026",
    "artist": "Together Band",
    "venue": "อิมแพ็คอารีน่า",
    "address": "เมืองทองธานี นนทบุรี",
    "concert_datetime": "2026-06-15T19:00:00",
    "status": "on_sale"
  }
]
```

**หมายเหตุ `status`** เป็น dynamic status ที่คำนวณจากเวลาปัจจุบัน:
- `draft` — ยังไม่เปิด (organizer แก้ไขได้)
- `upcoming` — ยังไม่ถึงเวลาขาย
- `on_sale` — เปิดขายอยู่
- `closed` — ปิดการขายแล้ว
- `cancelled` — ยกเลิกคอนเสิร์ต

Frontend ควรแสดงปุ่ม "เข้าคิว" เฉพาะตอน `on_sale` เท่านั้น

---

### 2.3 `POST /booking/concerts/{concert_id}/queue/join`

**Description:** เข้าคิวของคอนเสิร์ต เรียกตอนกดปุ่ม "เข้าคิว" ในหน้ารายละเอียดคอนเสิร์ต

**Auth:** Customer JWT

**Path params:** `concert_id` (int)

**Request body:** ไม่มี

**Response 201:**
```json
{
  "message": "เข้าคิวสำเร็จ",
  "queue_id": 42,
  "priority_score": 100,
  "entered_at": "2026-04-22T10:30:00"
}
```

ถ้าเคยเข้าคิวแล้วและยัง `waiting`/`admitted` อยู่ จะคืน:
```json
{ "message": "คุณอยู่ในคิวนี้แล้ว", "queue_id": 42, "status": "waiting" }
```

**Errors:**
- `400` — ไม่พบ customer profile / คอนเสิร์ตยังไม่เปิดขาย / ปิดการขายแล้ว / ถูกยกเลิก
- `403` — ไม่ใช่ role customer
- `404` — ไม่พบคอนเสิร์ต

---

### 2.4 `GET /booking/concerts/{concert_id}/queue/status`

**Description:** ดูสถานะคิวของตัวเอง + ลำดับในคิว ใช้ polling ทุก 3-5 วินาที ในหน้า "รอคิว"

**Auth:** Customer JWT

**Path params:** `concert_id`

**Response 200:**
```json
{
  "queue_id": 42,
  "priority_score": 100,
  "entered_at": "2026-04-22T10:30:00",
  "status": "waiting",
  "position_in_queue": 5,
  "total_waiting": 120
}
```

**ค่า `status` ที่เป็นไปได้:** `waiting` / `admitted` / `expired` / `completed`

เมื่อ `status === 'admitted'` → Frontend ควรพาผู้ใช้ไปหน้าเลือกโซน/ที่นั่งอัตโนมัติ  
`position_in_queue` จะเป็น `null` ถ้าไม่ได้อยู่สถานะ `waiting`

**Errors:**
- `400` — ไม่พบ customer profile
- `404` — ผู้ใช้ยังไม่เคยเข้าคิวนี้

---

### 2.5 `GET /booking/concerts/{concert_id}/zones`

**Description:** ดูโซนทั้งหมดของคอนเสิร์ต + จำนวนที่นั่งว่าง ใช้ในหน้า "เลือกโซน" หลัง admit เข้าคิวแล้ว

**Auth:** ไม่ต้อง (public — แต่ frontend ควรเรียกหลัง admit)

**Response 200:**
```json
[
  {
    "zone_id": 10,
    "zone_name": "VIP",
    "price": 3500.0,
    "total_seats": 200,
    "is_active": true,
    "available_count": 45
  }
]
```

`is_active: false` = โซนถูกปิด (ปุ่มเลือกโซนต้อง disable)

---

### 2.6 `GET /booking/concerts/{concert_id}/zones/{zone_id}/seats`

**Description:** ดูที่นั่งทั้งหมดในโซน ใช้ render seat map ในหน้า "เลือกที่นั่ง"

**Auth:** ไม่ต้อง

**Response 200:**
```json
[
  { "seat_id": 101, "seat_row": "A", "seat_number": "1", "status": "available" },
  { "seat_id": 102, "seat_row": "A", "seat_number": "2", "status": "sold" }
]
```

**ค่า `status`:** `available` / `locked` / `sold` / `closed`
- Frontend ให้คลิกได้เฉพาะ `available`
- สีที่แนะนำ: available=เขียว, locked=เหลือง (คนอื่นกำลังจะจอง), sold=แดง, closed=เทา

---

### 2.7 `POST /booking/book`

**Description:** สร้าง booking จากที่นั่งที่เลือก เรียกตอนกด "ยืนยันที่นั่ง" ในหน้าเลือกที่นั่ง
ต้อง admit queue ก่อนถึงจะเรียกได้

**Auth:** Customer JWT

**Request body:**
```json
{
  "concert_id": 1,
  "seat_ids": [101, 102],
  "delivery_type": "digital"
}
```
- `delivery_type`: `digital` (default) / `pickup` / `postal`

**Response 201:**
```json
{
  "message": "จองสำเร็จ กรุณาชำระเงินภายใน 15 นาที",
  "booking_id": 555,
  "total_amount": 7000.0,
  "seat_count": 2,
  "expired_at": "2026-04-22T10:45:00+00:00"
}
```
Frontend ควรเริ่ม countdown 15 นาทีจาก `expired_at` และ redirect ไปหน้าชำระเงินทันที

**Errors:**
- `400` — seat_ids ว่าง / seat ไม่ใช่ของคอนเสิร์ตนี้
- `403` — ไม่ใช่ customer / ยังไม่ได้ admit queue
- `404` — seat ไม่พบบางตัว
- `409` — seat ถูกคนอื่นจองไปแล้ว (ให้ผู้ใช้เลือกใหม่)

---

### 2.8 `GET /booking/my`

**Description:** ดูประวัติการจองของลูกค้าเอง ใช้ในหน้า "ประวัติการจอง / My Tickets"

**Auth:** Customer JWT

**Response 200:**
```json
[
  {
    "booking_id": 555,
    "concert_title": "Together Live 2026",
    "concert_datetime": "2026-06-15T19:00:00",
    "total_tickets": 2,
    "total_amount": 7000.0,
    "status": "paid",
    "created_at": "2026-04-22T10:30:00"
  }
]
```

**ค่า `status` ที่ต้องแสดง UI ต่างกัน:**
- `pending` — แสดงปุ่ม "ชำระเงิน" + countdown
- `paid` — แสดง QR ตั๋ว / ปุ่ม refund
- `cancelled` / `expired` — แสดงแบบ disabled
- `zone_closed_action_required` — **แสดง banner สีแดง** + ปุ่ม 2 ปุ่ม: "ขอคืนเงิน" / "เลือกที่นั่งใหม่ฟรี"
- `refund_pending` — แสดง "รอรับเงินคืน"

---

### 2.9 `GET /booking/{booking_id}/tickets`

**Description:** ดึงตั๋วรายใบใน booking (รวม `qr_hash`) ใช้ในหน้า "My Tickets" ตอน expand booking ที่จ่ายเงินแล้ว

**Auth:** Customer JWT (ต้องเป็นเจ้าของ booking)

**Path params:** `booking_id`

**Response 200:** (array)
```json
[
  {
    "ticket_id": 901,
    "qr_hash": "TKT-901-abc123def456",
    "seat_number": "A1",
    "zone_name": "VIP",
    "is_used": false
  }
]
```

Frontend ใช้ `qr_hash` render เป็น QR code (เช่น `qrcode.js`) ส่งให้ staff scan
`is_used: true` = ถูก check-in ไปแล้ว

**Errors:**
- `400` — ไม่พบ customer profile
- `403` — ไม่ใช่ booking ของคุณ

---

### 2.10 `POST /booking/{booking_id}/confirm`

**Description:** **Stub endpoint สำหรับทดสอบ** — ยืนยันการชำระแบบ manual (จะถูกแทนด้วย payment webhook ในโปรดักชัน)
Frontend ปกติ**ไม่ควรเรียก** ให้ใช้ flow payment แทน

**Auth:** Customer JWT

**Response 200:**
```json
{ "message": "ยืนยันการจองสำเร็จ", "booking_id": 555, "status": "paid" }
```

**Errors:**
- `400` — booking ไม่ได้อยู่สถานะ `pending`
- `403` — ไม่ใช่ booking ของคุณ
- `404` — ไม่พบ booking

---

### 2.11 `POST /booking/{booking_id}/rebook`

**Description:** ใช้ voucher จาก zone closure เลือกที่นั่งใหม่ฟรีในโซนอื่น
เรียกเมื่อลูกค้ากดปุ่ม "เลือกที่นั่งใหม่ฟรี" จาก banner ของ booking สถานะ `zone_closed_action_required`

**Auth:** Customer JWT

**Request body:**
```json
{ "new_seat_ids": [201, 202] }
```
- จำนวน `new_seat_ids` ต้องเท่ากับจำนวนตั๋วเดิมเป๊ะ
- ที่นั่งใหม่ต้องอยู่ในโซนที่ยัง active และสถานะ `available`
- ต้องเป็นคอนเสิร์ตเดียวกับ booking เดิม

**Response 200:**
```json
{
  "message": "ย้ายที่นั่งสำเร็จ (free upgrade)",
  "booking_id": 555,
  "status": "paid",
  "new_seat_ids": [201, 202],
  "new_ticket_ids": [901, 902]
}
```
หลังได้ response นี้ booking จะกลับเป็น `paid` และใช้ตั๋วใหม่ได้ทันที (ไม่ต้องชำระเพิ่ม)

**Errors:**
- `400` — ไม่พบ customer profile / `new_seat_ids` มีที่นั่งซ้ำ
- `403` — ไม่ใช่ role customer / ไม่ใช่ booking ของคุณ
- `404` — ไม่พบ booking / ไม่พบที่นั่ง
- `409` — booking ไม่ได้อยู่สถานะ `zone_closed_action_required` / จำนวนที่นั่งไม่ตรงเดิม / ที่นั่งซ้ำกับของเดิม / ที่นั่งอยู่ในโซนที่ปิด / ที่นั่งไม่ว่าง / คอนเสิร์ตไม่ตรง

---

## 3. Organizer APIs

> **หมายเหตุ:** ทุก endpoint ต้องใช้ JWT ที่ role = `organizer`

### 3.1 `GET /organizer/concerts/{concert_id}/queues`

**Description:** ดูรายชื่อลูกค้าในคิวทั้งหมดของคอนเสิร์ต ใช้ในหน้า Dashboard จัดการคิว

**Auth:** Organizer JWT

**Response 200:**
```json
[
  {
    "queue_id": 42,
    "customer_name": "สมชาย ใจดี",
    "customer_email": "somchai@example.com",
    "priority_score": 100,
    "status": "waiting",
    "entered_at": "2026-04-22T10:30:00"
  }
]
```
เรียงตาม `priority_score` DESC แล้ว `entered_at` ASC (ลำดับที่จะได้ admit ก่อน)

**Errors:**
- `403` — ไม่ใช่ organizer

---

### 3.2 `POST /organizer/queues/{queue_id}/admit`

**Description:** Admit ลูกค้าจากคิว (เปลี่ยน `waiting` → `admitted`) ให้เข้าไปเลือกที่นั่ง
เรียกเมื่อ organizer กดปุ่ม "Admit" ในแถวของคิวนั้น

**Auth:** Organizer JWT

**Path params:** `queue_id`

**Request body:** ไม่มี

**Response 200:**
```json
{ "message": "Admit คิวหมายเลข 42 สำเร็จแล้ว" }
```

**Errors:**
- `400` — คิวไม่ได้อยู่สถานะ `waiting` (อาจถูก admit ไปแล้ว หรือ expired)
- `403` — ไม่ใช่ organizer

---

### 3.3 `PATCH /organizer/queues/{queue_id}/priority`

**Description:** แก้ไข priority score ของคิวด้วยมือ ใช้เมื่อ organizer ต้องการ override คะแนนอัตโนมัติ

**Auth:** Organizer JWT

**Request body:**
```json
{ "priority_score": 150 }
```

**Response 200:**
```json
{ "message": "อัปเดต Priority ของคิวที่ 42 เป็น 150 สำเร็จ" }
```

**Errors:**
- `403` — ไม่ใช่ organizer
- `404` — ไม่พบคิว

---

### 3.4 `POST /organizer/concerts`

**Description:** สร้างคอนเสิร์ตใหม่ พร้อมกำหนดโซน + ที่นั่ง + อัปโหลดรูป poster

**Auth:** Organizer JWT

**Content-Type:** `multipart/form-data` ⚠️ ไม่ใช่ JSON

**Form fields:**
| Field | Type | Required | คำอธิบาย |
| --- | --- | --- | --- |
| `title` | string | ✅ | ชื่อคอนเสิร์ต |
| `artist` | string | ✅ | ชื่อศิลปิน |
| `venue` | string | ✅ | สถานที่ |
| `address` | string | ✅ | ที่อยู่ (ใช้ใน auto_sort เทียบกับลูกค้า) |
| `concert_datetime` | string (ISO) | ✅ | วันเวลาแสดง |
| `sale_open_at` | string (ISO) | ✅ | เวลาเปิดขาย |
| `sale_close_at` | string (ISO) | ❌ | เวลาปิดขาย (optional) |
| `status` | string | ❌ | `on_sale` (default) / `draft` |
| `zones_json` | string (JSON) | ❌ | array ของโซน — default `"[]"` |
| `image` | file | ❌ | รูป poster (.jpg/.png/.webp) |

**โครงสร้าง `zones_json`:**
```json
[
  { "zone_name": "VIP", "total_seats": 50, "price": 5000, "row_prefix": "V" },
  { "zone_name": "Standard", "total_seats": 100, "price": 2000, "row_prefix": "A" }
]
```
- `row_prefix`: prefix ของหมายเลขที่นั่ง (เช่น `"A"` → seat `A1`, `A2`, ...)
- ระบบจะสร้าง `seat` ให้อัตโนมัติตาม `total_seats`

**ตัวอย่าง fetch (frontend):**
```js
const fd = new FormData();
fd.append("title", "Together Live 2026");
fd.append("artist", "Together Band");
// ... fields อื่น ๆ
fd.append("zones_json", JSON.stringify(zones));
if (file) fd.append("image", file);
await fetch("/organizer/concerts", { method: "POST", body: fd, headers: { Authorization: `Bearer ${token}` } });
```

**Response 201:**
```json
{
  "message": "สร้างคอนเสิร์ตสำเร็จ",
  "concert_id": 1,
  "zones": [
    { "zone_id": 10, "zone_name": "VIP", "seat_count": 50 }
  ]
}
```

**Errors:**
- `400` — ไม่พบ organizer profile / ไฟล์รูปนามสกุลไม่รองรับ
- `403` — ไม่ใช่ organizer
- `422` — `zones_json` parse ไม่ได้ / total_seats ≤ 0

---

### 3.5 `GET /organizer/concerts/{concert_id}`

**Description:** ดึง payload คอนเสิร์ตแบบเต็มสำหรับใช้ใน "ฟอร์มแก้ไขคอนเสิร์ต" (รวม sale window + zones รายโซน)

**Auth:** Organizer JWT (ต้องเป็นเจ้าของคอนเสิร์ต)

**Response 200:**
```json
{
  "concert_id": 1,
  "title": "Together Live 2026",
  "artist": "Together Band",
  "venue": "อิมแพ็คอารีน่า",
  "address": "เมืองทองธานี นนทบุรี",
  "concert_datetime": "2026-06-15T19:00:00",
  "sale_open_at": "2026-05-01T10:00:00",
  "sale_close_at": "2026-06-14T23:59:00",
  "status": "on_sale",
  "image_url": "database/image/abc123.jpg",
  "zones": [
    {
      "zone_id": 10,
      "zone_name": "VIP",
      "total_seats": 50,
      "price": 5000.0,
      "row_prefix": "V"
    }
  ]
}
```

**Errors:**
- `403` — ไม่ใช่ organizer / ไม่ใช่เจ้าของคอนเสิร์ต
- `404` — ไม่พบคอนเสิร์ต

---

### 3.6 `PATCH /organizer/concerts/{concert_id}`

**Description:** อัปเดตคอนเสิร์ต + zones ตาม business rules:
- `status` ถูกตรึงไว้ — ใช้ `DELETE` endpoint สำหรับ cancel
- zone ที่ไม่อยู่ใน `zones_json` ใหม่ → ลบได้เฉพาะถ้าไม่มี ticket อ้างอิง
- ลด `total_seats` ห้ามทำถ้าโซนมี ticket อยู่แล้ว / เพิ่มได้เสมอ (ต่อท้ายเลข seat เดิม)
- ราคา/ชื่อ zone เปลี่ยนได้เสมอ
- `image`: ไม่ส่งมา = คงรูปเดิม / ส่งมา = บันทึกใหม่และอัปเดต URL

**Auth:** Organizer JWT (ต้องเป็นเจ้าของคอนเสิร์ต)

**Content-Type:** `multipart/form-data` ⚠️ เหมือน `POST /organizer/concerts`

**Form fields:** เหมือน `POST /organizer/concerts` ยกเว้น **ไม่มี `status`** และ field `zones_json` รายโซนสามารถใส่ `zone_id` เพื่อ update zone เดิมได้:
```json
[
  { "zone_id": 10, "zone_name": "VIP", "total_seats": 60, "price": 5500, "row_prefix": "V" },
  { "zone_name": "New Zone", "total_seats": 30, "price": 3000, "row_prefix": "N" }
]
```
- มี `zone_id` = update zone เดิม
- ไม่มี `zone_id` = สร้าง zone ใหม่
- zone_id เดิมที่หายไปจาก array = ลบ (ถ้าไม่มี ticket อ้าง)

**Response 200:**
```json
{ "message": "อัปเดตคอนเสิร์ตสำเร็จ", "concert_id": 1 }
```

**Errors:**
- `400` — `zones_json` parse ไม่ได้ / รูปนามสกุลไม่รองรับ
- `403` — ไม่ใช่ organizer / ไม่ใช่เจ้าของคอนเสิร์ต
- `404` — ไม่พบคอนเสิร์ต
- `409` — ลบ/ลด total_seats ของ zone ที่มี ticket อ้างอยู่ — ใช้ Close Zone แทน
- `422` — zone_id ไม่ใช่ของคอนเสิร์ตนี้ / ชื่อ zone ซ้ำกัน / total_seats ≤ 0

---

### 3.7 `DELETE /organizer/concerts/{concert_id}`

**Description:** Soft-cancel คอนเสิร์ต — เปลี่ยน `concert.status = 'cancelled'`
**ไม่ลบ** booking/payment/refund/queue_session เพื่อเก็บ audit trail

**Auth:** Organizer JWT (ต้องเป็นเจ้าของคอนเสิร์ต)

**Response 200:**
```json
{
  "message": "ยกเลิกคอนเสิร์ตสำเร็จ",
  "concert_id": 1,
  "status": "cancelled"
}
```

**Errors:**
- `403` — ไม่ใช่ organizer / ไม่ใช่เจ้าของคอนเสิร์ต
- `404` — ไม่พบคอนเสิร์ต
- `409` — คอนเสิร์ตนี้ถูกยกเลิกไปแล้ว
- `500` — internal error

---

### 3.8 `POST /organizer/concerts/{concert_id}/queues/auto_sort`

**Description:** สั่งให้ระบบคำนวณ priority score ของคิวทั้งหมดใหม่ โดยเทียบ address ของคอนเสิร์ตกับ address ของลูกค้า (ตรง = 100, ไม่ตรง = 10)
ใช้ตอน organizer กดปุ่ม "เรียงคิวอัตโนมัติ" ในหน้า Dashboard คิว

**Auth:** Organizer JWT

**Response 200:**
```json
{ "message": "เรียงคิวอัตโนมัติสำเร็จ (อัปเดตคะแนนใหม่ 120 คิว)" }
```

**Errors:**
- `403` — ไม่ใช่ organizer
- `404` — ไม่พบคอนเสิร์ต

---

### 3.9 `POST /organizer/zones/{zone_id}/close`

**Description:** ปิดโซน (สำหรับกรณีคนซื้อน้อย / เปิดขายไม่สำเร็จ)
ระบบจะ:
- ตั้งโซน `is_active = false`
- ที่นั่งที่ยังไม่ sold จะเปลี่ยนเป็น `closed`
- booking ที่จ่ายเงินแล้ว (`paid`) และมีตั๋วในโซนนี้ จะเปลี่ยนเป็น `zone_closed_action_required` (voucher ให้ลูกค้าเลือก refund หรือย้ายที่นั่ง)
- ส่งอีเมลแจ้งลูกค้าที่ได้รับผลกระทบ (mock)

**Auth:** Organizer JWT (ต้องเป็นเจ้าของคอนเสิร์ตเท่านั้น)

**Response 200:**
```json
{
  "message": "ปิดโซนสำเร็จ",
  "zone_id": 10,
  "zone_name": "VIP",
  "concert_id": 1,
  "seats_closed": 150,
  "affected_bookings": 12,
  "notifications_queued": 12
}
```

**Errors:**
- `400` — ไม่พบ organizer profile / โซนถูกปิดอยู่แล้ว
- `403` — ไม่ใช่ organizer ของคอนเสิร์ตนี้
- `404` — ไม่พบโซน
- `500` — ปิดโซนไม่สำเร็จ (internal error)

---

### 3.10 `GET /organizer/concerts/{concert_id}/refund-pending`

**Description:** ดึงรายชื่อ booking ที่อยู่สถานะ `refund_pending` ของคอนเสิร์ตที่ organizer เป็นเจ้าของ
ใช้ในหน้า "อนุมัติคำขอคืนเงิน" — แสดงรายละเอียดบัญชีธนาคาร + เหตุผลของลูกค้า

**Auth:** Organizer JWT (ต้องเป็นเจ้าของคอนเสิร์ต)

**Response 200:** (array, เรียงตาม `created_at` DESC)
```json
[
  {
    "booking_id": 555,
    "total_amount": 7000.0,
    "total_tickets": 2,
    "created_at": "2026-04-22T10:30:00",
    "customer_name": "สมชาย ใจดี",
    "customer_email": "somchai@example.com",
    "refund_id": 80,
    "bank_name": "ธนาคารกสิกรไทย",
    "account_number": "1234567890",
    "account_name": "สมชาย ใจดี",
    "reason": "ติดธุระกะทันหัน",
    "requested_at": "2026-04-22T11:00:00"
  }
]
```

**Errors:**
- `400` — ไม่พบ organizer profile
- `403` — ไม่ใช่ organizer ของคอนเสิร์ตนี้
- `404` — ไม่พบ concert

---

### 3.11 `POST /organizer/bookings/{booking_id}/approve-refund`

**Description:** อนุมัติคำขอคืนเงิน — booking → `refunded`, ลบ ticket, seat → `available`,
refund row → `completed`, บันทึก `finance` หักลบ
**ตั๋วที่ check-in ไปแล้วจะถูก reject** เพื่อกัน FK conflict กับ `ticket_checkin`

**Auth:** Organizer JWT (ต้องเป็นเจ้าของคอนเสิร์ต)

**Path params:** `booking_id`

**Request body:** ไม่มี

**Response 200:**
```json
{
  "message": "อนุมัติคำขอคืนเงินสำเร็จ",
  "booking_id": 555,
  "amount": "7000.00",
  "status": "refunded"
}
```

**Errors:**
- `400` — ไม่พบ organizer profile / ตั๋วถูก check-in ไปแล้ว (ห้ามคืนเงิน)
- `403` — ไม่ใช่ organizer ของคอนเสิร์ตนี้
- `404` — ไม่พบ booking
- `409` — booking ไม่ได้อยู่สถานะ `refund_pending`

---

### 3.12 `GET /organizer/concerts/{concert_id}/dashboard`

**Description:** ดึงสรุปรายรับ/รายจ่ายรายวันของคอนเสิร์ต (timezone: Asia/Bangkok) ใช้ใน dashboard การเงิน

**Auth:** Organizer JWT (ต้องเป็นเจ้าของคอนเสิร์ต)

**Response 200:**
```json
{
  "concert_id": 1,
  "daily_stats": [
    {
      "date": "2026-05-01",
      "income": "45000.00",
      "expense": "7000.00",
      "net_profit": "38000.00"
    }
  ],
  "grand_totals": {
    "total_income": "150000.00",
    "total_expense": "12000.00",
    "total_net_profit": "138000.00"
  }
}
```
- `income` = ยอด payment ที่ชำระสำเร็จ (สถานะ `paid`)
- `expense` = ยอด refund ที่ไม่ถูก reject
- Frontend ควร render เป็นกราฟเส้น/แท่ง

**Errors:**
- `403` — ไม่ใช่ organizer / ไม่ใช่เจ้าของคอนเสิร์ต
- `404` — ไม่พบคอนเสิร์ต

---

## 4. Payment APIs

### 4.1 `POST /api/v1/payments/generate-qr`

**Description:** สร้าง QR PromptPay สำหรับจ่ายเงิน booking ที่อยู่สถานะ `pending`
เรียกเมื่อกด "ชำระเงิน" ในหน้ารายละเอียด booking

Idempotent: กดซ้ำหลายครั้งจะได้ `transaction_ref` เดิม (reuse pending payment)

**Auth:** Customer JWT

**Request body:**
```json
{ "booking_id": 555, "method": "qr_code" }
```
ปัจจุบันรองรับแค่ `qr_code`

**Response 200:**
```json
{
  "payment_id": 700,
  "transaction_ref": "TX-555-1714000000-abcd1234",
  "amount": "7000.00",
  "qr_payload": "00020101021229...6304ABCD",
  "expired_at": "2026-04-22T10:45:00+00:00"
}
```
Frontend:
- Render `qr_payload` เป็น QR code ด้วย library เช่น `qrcode.js` หรือ `react-native-qrcode`
- แสดง countdown จาก `expired_at`
- หลัง render QR แล้วเริ่ม polling `GET /api/v1/payments/status/{transaction_ref}` ทุก 3-5 วินาที

**Errors:**
- `400` — booking ไม่ได้สถานะ `pending` / booking หมดเวลา / ไม่พบ customer profile
- `403` — ไม่ใช่ customer / ไม่ใช่ booking ของคุณ
- `404` — ไม่พบ booking
- `500` — สร้าง QR ไม่สำเร็จ

---

### 4.2 `GET /api/v1/payments/status/{transaction_ref}`

**Description:** เช็คสถานะ payment ใช้ polling จากหน้ารอจ่ายเงิน (หลัง generate QR) ทุก 3-5 วินาที

**Auth:** Customer JWT

**Path params:** `transaction_ref` (string จาก generate-qr)

**Response 200:**
```json
{
  "transaction_ref": "TX-555-1714000000-abcd1234",
  "payment_id": 700,
  "booking_id": 555,
  "payment_status": "pending",
  "booking_status": "pending",
  "amount": "7000.00",
  "paid_at": null,
  "expired_at": "2026-04-22T10:45:00+00:00",
  "seconds_remaining": 540
}
```

**เงื่อนไขการหยุด polling (terminal states):**
- `payment_status` ∈ `paid` / `failed` / `expired`
- หรือ `booking_status` ∈ `paid` / `cancelled` / `expired`

เมื่อ `payment_status === 'paid'` → ไปหน้า "จองสำเร็จ" / My Tickets  
เมื่อ `seconds_remaining <= 0` → แสดง "หมดเวลา กรุณาจองใหม่"

**Errors:**
- `403` — ไม่ใช่ customer / ไม่ใช่ booking ของคุณ
- `404` — ไม่พบ transaction_ref

---

### 4.3 `POST /api/v1/payments/webhook`

> **Internal only — Frontend ไม่ต้องเรียก endpoint นี้**
>
> Gateway (เช่น PromptPay provider) เป็นผู้ call เข้ามาเพื่อแจ้งผลการโอนเงิน ต้องมี HMAC signature ใน header `X-Signature` ที่ถูกต้อง
> ถ้าทีม Frontend กำลัง mock flow ใน local ให้ใช้ endpoint นี้ร่วมกับ test script ที่มี secret เดียวกัน

---

## 5. Refund APIs

### 5.1 `POST /api/v1/refunds/request`

**Description:** ยื่นฟอร์มขอคืนเงินสำหรับ booking ที่จ่ายเงินแล้ว **ภายใน 7 วันหลังชำระเงิน**
เรียกเมื่อลูกค้ากดปุ่ม "ขอคืนเงิน" + กรอกฟอร์มบัญชีธนาคาร ในหน้ารายละเอียด booking

**Auth:** Customer JWT

**Request body:**
```json
{
  "booking_id": 555,
  "bank_name": "ธนาคารกสิกรไทย",
  "account_number": "1234567890",
  "account_name": "สมชาย ใจดี",
  "reason": "ติดธุระกะทันหัน"
}
```
- `bank_name`: 1-100 ตัวอักษร
- `account_number`: 5-30 ตัวอักษร
- `account_name`: 1-150 ตัวอักษร
- `reason`: optional สูงสุด 1000 ตัวอักษร

**Response 200:**
```json
{
  "message": "ยื่นคำขอคืนเงินสำเร็จ",
  "refund_id": 80,
  "booking_id": 555,
  "amount": "7000.00",
  "status": "pending_transfer"
}
```
หลังยื่นสำเร็จ `booking.status` จะเปลี่ยนเป็น `refund_pending` ที่นั่งกลับมาเป็น `available` พร้อมขายใหม่
Frontend ควรแสดง "รอรับเงินคืน" ในหน้าประวัติ

**Errors:**
- `400` — booking ไม่ใช่สถานะ `paid` / ไม่พบ payment ที่จ่ายสำเร็จ / **เกิน 7 วันหลังจ่ายเงิน** / ไม่พบ customer profile
- `403` — ไม่ใช่ customer / ไม่ใช่ booking ของคุณ
- `404` — ไม่พบ booking
- `409` — เคยยื่นคำขอไปแล้ว (response จะ include `refund_id` + `status` เดิม)
- `500` — ยื่นไม่สำเร็จ

---

### 5.2 `POST /api/v1/refunds/voucher/{booking_id}`

**Description:** ใช้ voucher จาก zone closure ขอคืนเงินเต็มจำนวน (ไม่มีจำกัด 7 วัน)
เรียกเมื่อลูกค้ากดปุ่ม "ขอคืนเงิน" จาก banner ของ booking สถานะ `zone_closed_action_required`

**Auth:** Customer JWT

**Path params:** `booking_id`

**Request body:**
```json
{
  "bank_name": "ธนาคารกสิกรไทย",
  "account_number": "1234567890",
  "account_name": "สมชาย ใจดี",
  "reason": "โซนถูกปิด"
}
```
โครงสร้างเหมือน `/refunds/request` แต่**ไม่ต้องส่ง `booking_id`** ใน body (มาจาก URL แทน)

**Response 200:**
```json
{
  "message": "ยื่นคำขอคืนเงิน voucher สำเร็จ",
  "refund_id": 81,
  "booking_id": 555,
  "amount": "7000.00",
  "status": "pending_transfer"
}
```
หลังยื่นสำเร็จ `booking.status` จะเปลี่ยนจาก `zone_closed_action_required` → `refund_pending`

**Errors:**
- `400` — ไม่พบ customer profile
- `403` — ไม่ใช่ customer / ไม่ใช่ booking ของคุณ
- `404` — ไม่พบ booking
- `409` — booking ไม่ใช่สถานะ `zone_closed_action_required` / ไม่พบ payment ที่จ่ายสำเร็จ / booking ถูกเปลี่ยนสถานะไปแล้ว (race condition) / เคยยื่น refund ไว้แล้ว
- `500` — ยื่นไม่สำเร็จ

---

## 6. Staff APIs

> **หมายเหตุ:** ทุก endpoint ต้องใช้ JWT ที่ role = `staff`

### 6.1 `POST /staff/verify-ticket`

**Description:** สแกน/ยืนยัน QR ตั๋วเพื่อให้ผู้เข้างานเข้าได้
ระบบจะเช็คว่าตั๋วยัง valid (booking `paid` + `is_used = false`) ก่อน mark `is_used = true` และบันทึก `ticket_checkin`

Frontend (Staff scanner) ใช้ `jsqr` จับ QR จากกล้อง แล้วส่ง `qr_hash` ที่ได้มา
รองรับทั้ง `qr_hash` (string) และ `ticket_id` (numeric string) — ระบบจะลองทั้งสองทาง

**Auth:** Staff JWT

**Request body:**
```json
{ "qr_hash": "TKT-901-abc123def456" }
```

**Response 200:**
```json
{
  "message": "Verify ตั๋วสำเร็จ อนุญาตให้เข้างานได้",
  "ticket_id": 901,
  "concert_title": "Together Live 2026",
  "zone_name": "VIP",
  "seat_number": "A1"
}
```

**Errors:**
- `400` — ไม่พบ staff profile / booking ไม่ใช่สถานะ `paid` (เช่นถูก refund หรือ cancel ไปแล้ว)
- `403` — ไม่ใช่ role staff
- `404` — ไม่พบตั๋วใบนี้ในระบบ
- `409` — ตั๋วถูกใช้งานไปแล้ว (Duplicate Entry)
- `500` — internal error

---

## ภาคผนวก: สรุป Status ต่าง ๆ

### `booking.status`
| Value | ความหมาย | UI Action |
|---|---|---|
| `pending` | รอชำระเงิน | แสดง countdown + ปุ่มจ่าย |
| `paid` | ชำระแล้ว | แสดง QR ตั๋ว + ปุ่ม refund (ถ้ายังไม่เกิน 7 วัน) |
| `cancelled` | ยกเลิกแล้ว | disabled |
| `expired` | หมดเวลาชำระ | disabled |
| `zone_closed_action_required` | โซนถูกปิด — รอลูกค้าเลือก | **banner + 2 ปุ่ม** (refund-voucher / rebook) |
| `refund_pending` | รอรับเงินคืน | แสดงสถานะ refund |

### `seat.status`
`available` / `locked` / `sold` / `closed`

### `queue_session.status`
`waiting` / `admitted` / `expired` / `completed`

### `payment.status`
`pending` / `paid` / `failed` / `expired`

### `refund.status`
`pending_transfer` / `requested` / `approved` / `rejected` / `processing` / `completed`

---

## ภาคผนวก: User Flow ที่สำคัญ

### Flow 1: จองตั๋วปกติ
1. `GET /booking/concerts` → เลือกคอนเสิร์ต
2. `POST /booking/concerts/{id}/queue/join` → เข้าคิว
3. Polling `GET /booking/concerts/{id}/queue/status` → รอ `admitted`
4. `GET /booking/concerts/{id}/zones` → เลือกโซน
5. `GET /booking/concerts/{id}/zones/{zone_id}/seats` → เลือกที่นั่ง
6. `POST /booking/book` → ได้ `booking_id` + countdown 15 นาที
7. `POST /api/v1/payments/generate-qr` → ได้ QR
8. Polling `GET /api/v1/payments/status/{tx_ref}` → รอ `paid`
9. → หน้า "จองสำเร็จ" / `GET /booking/my`

### Flow 2: ขอคืนเงินปกติ (ภายใน 7 วัน)
1. `GET /booking/my` → เลือก booking สถานะ `paid`
2. กรอกฟอร์มบัญชี → `POST /api/v1/refunds/request`
3. booking กลายเป็น `refund_pending`

### Flow 3: Zone Closure — Voucher
1. Organizer เรียก `POST /organizer/zones/{zone_id}/close`
2. ลูกค้าที่ได้รับผลกระทบเห็น booking เป็น `zone_closed_action_required` ใน `GET /booking/my`
3. ลูกค้าเลือก 1 ใน 2:
   - **Refund:** `POST /api/v1/refunds/voucher/{booking_id}` → `refund_pending`
   - **Rebook:** เลือกที่นั่งใหม่ → `POST /booking/{booking_id}/rebook` → กลับเป็น `paid`

### Flow 4: Organizer อนุมัติคำขอคืนเงิน
1. `GET /organizer/concerts/{concert_id}/refund-pending` → ดูคิวขออนุมัติ
2. กดปุ่มอนุมัติ → `POST /organizer/bookings/{booking_id}/approve-refund`
3. booking → `refunded`, seat → `available`, refund row → `completed`

### Flow 5: Staff QR Check-in
1. ลูกค้าเปิดหน้า My Tickets → `GET /booking/{booking_id}/tickets` → render QR ด้วย `qr_hash`
2. Staff เปิดหน้า scanner — ใช้ `jsqr` จับ QR จากกล้อง
3. ส่ง `qr_hash` ไป `POST /staff/verify-ticket`
4. ถ้า `200` → "อนุญาตเข้างาน" + แสดง zone/seat
5. ถ้า `409` → "ตั๋วถูกใช้ไปแล้ว" (กัน Duplicate Entry)
