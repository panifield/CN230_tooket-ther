"""
routes/booking.py — Queue, Seat Selection, Booking Endpoints
-------------------------------------------------------------
Phase 3 — Priority Queue:
  POST /booking/concerts/{concert_id}/queue/join    เข้าคิว
  GET  /booking/concerts/{concert_id}/queue/status  ดูลำดับคิว
  POST /booking/concerts/{concert_id}/queue/admit   admit ตัวเองเข้าสู่ขั้นตอนจอง

Phase 4 — Seat Soft Lock & Booking:
  GET  /booking/concerts/{concert_id}/zones                 แสดงโซนทั้งหมด
  GET  /booking/concerts/{concert_id}/zones/{zone_id}/seats แสดงที่นั่งในโซน
  POST /booking/book                                         จองที่นั่ง (transaction)
  GET  /booking/my                                           ประวัติการจองของตัวเอง
  POST /booking/{booking_id}/confirm                         ยืนยันชำระ (stub สำหรับ A3)
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from models import fix_all_sequences, get_db_connection
from routes.deps import CurrentUser

booking_router = APIRouter(prefix="/booking", tags=["booking"])

# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


@booking_router.get("/health")
def booking_health():
    return {"service": "booking", "status": "ok"}


# ---------------------------------------------------------------------------
# Phase 3 — Priority Queue
# ---------------------------------------------------------------------------


@booking_router.post(
    "/concerts/{concert_id}/queue/join", status_code=status.HTTP_201_CREATED
)
def queue_join(concert_id: int, current_user: CurrentUser):
    """
    เข้าคิวของ concert
    - ต้อง login และ role='customer'
    - คำนวณ priority_score จาก location_score ใน customer_profile
    - INSERT queue_session (UNIQUE: customer_id + concert_id → ป้องกันเข้าซ้ำ)
    """
    if current_user["role"] != "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="เฉพาะลูกค้าเท่านั้นที่เข้าคิวได้",
        )

    customer_profile_id = current_user.get("customer_profile_id")
    if not customer_profile_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ไม่พบ customer profile ของคุณ",
        )

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            fix_all_sequences(cur)
            # ดึง address ของผู้ใช้
            cur.execute(
                "SELECT address FROM users WHERE id = %s", (current_user["user_id"],)
            )
            u_addr_row = cur.fetchone()
            u_addr = u_addr_row[0] if u_addr_row else ""
            u_addr_lower = u_addr.strip().lower()

            # เช็ก concert มีอยู่จริงและเช็ก dynamic status จากเวลาจริง
            cur.execute(
                """
                SELECT id, address,
                  CASE 
                    WHEN status = 'cancelled' THEN 'cancelled'
                    WHEN status = 'draft' THEN 'draft'
                    WHEN NOW() < sale_open_at THEN 'upcoming'
                    WHEN (NOW() >= sale_open_at AND (sale_close_at IS NULL OR NOW() <= sale_close_at)) THEN 'on_sale'
                    ELSE 'closed'
                  END as dynamic_status
                FROM concert WHERE id = %s
                """,
                (concert_id,),
            )
            concert = cur.fetchone()
            if not concert:
                raise HTTPException(status_code=404, detail="ไม่พบ concert นี้")

            dynamic_status = concert[2]
            if dynamic_status != "on_sale":
                msg = {
                    "upcoming": "ยังไม่ถึงเวลาเปิดขาย (Upcoming)",
                    "closed": "ปิดการขายแล้ว (Closed)",
                    "cancelled": "คอนเสิร์ตถูกยกเลิก (Cancelled)",
                    "draft": "คอนเสิร์ตยังไม่พร้อมใช้งาน (Draft)",
                }.get(dynamic_status, "ไม่สามารถจองได้ในขณะนี้")
                raise HTTPException(status_code=400, detail=msg)

            # กำหนด priority score จาก address (100 ถ้า address ตรงกัน, 10 ถ้าไม่ตรง)
            c_addr = concert[1] or ""
            c_addr_lower = c_addr.strip().lower()
            priority_score = (
                100 if (c_addr_lower and c_addr_lower in u_addr_lower) else 10
            )

            # เช็กว่าเคยเข้าคิวไปแล้ว
            cur.execute(
                """
                SELECT id, status FROM queue_session
                WHERE customer_id = %s AND concert_id = %s
                """,
                (customer_profile_id, concert_id),
            )
            existing = cur.fetchone()

            expired_at = datetime.now(timezone.utc) + timedelta(hours=1)

            if existing:
                if existing[1] in ("waiting", "admitted"):
                    return {
                        "message": "คุณอยู่ในคิวนี้แล้ว",
                        "queue_id": existing[0],
                        "status": existing[1],
                    }
                else:
                    # ถ้า expired หรือ completed ไปแล้ว ให้ reset คิวใหม่
                    cur.execute(
                        """
                        UPDATE queue_session
                        SET status = 'waiting', entered_at = NOW(), expired_at = %s, priority_score = %s
                        WHERE id = %s
                        RETURNING id, priority_score, entered_at
                        """,
                        (expired_at, priority_score, existing[0]),
                    )
                    row = cur.fetchone()
            else:
                cur.execute(
                    """
                    INSERT INTO queue_session
                      (customer_id, concert_id, priority_score, expired_at, status)
                    VALUES (%s, %s, %s, %s, 'waiting')
                    RETURNING id, priority_score, entered_at
                    """,
                    (customer_profile_id, concert_id, priority_score, expired_at),
                )
                row = cur.fetchone()
        conn.commit()

    return {
        "message": "เข้าคิวสำเร็จ",
        "queue_id": row[0],
        "priority_score": row[1],
        "entered_at": row[2].isoformat(),
    }


@booking_router.get("/concerts/{concert_id}/queue/status")
def queue_status(concert_id: int, current_user: CurrentUser):
    """
    ดูสถานะคิวของตัวเอง + ลำดับในคิว (เรียงตาม priority DESC, entered_at ASC)
    """
    customer_profile_id = current_user.get("customer_profile_id")
    if not customer_profile_id:
        raise HTTPException(status_code=400, detail="ไม่พบ customer profile")

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # ดึงสถานะของตัวเอง
            cur.execute(
                """
                SELECT id, priority_score, entered_at, status
                FROM queue_session
                WHERE customer_id = %s AND concert_id = %s
                """,
                (customer_profile_id, concert_id),
            )
            my_queue = cur.fetchone()
            if not my_queue:
                raise HTTPException(status_code=404, detail="คุณยังไม่ได้เข้าคิว concert นี้")

            # นับลำดับ — คนที่มี priority_score สูงกว่าหรือเข้าก่อน
            cur.execute(
                """
                SELECT COUNT(*) + 1 AS position
                FROM queue_session
                WHERE concert_id = %s
                  AND status = 'waiting'
                  AND (
                    priority_score > %s
                    OR (priority_score = %s AND entered_at < %s)
                  )
                """,
                (concert_id, my_queue[1], my_queue[1], my_queue[2]),
            )
            position_row = cur.fetchone()
            position = position_row[0] if position_row else None

            # จำนวนคนที่รออยู่ทั้งหมด
            cur.execute(
                "SELECT COUNT(*) FROM queue_session WHERE concert_id = %s AND status = 'waiting'",
                (concert_id,),
            )
            total_waiting = cur.fetchone()[0]

    return {
        "queue_id": my_queue[0],
        "priority_score": my_queue[1],
        "entered_at": my_queue[2].isoformat(),
        "status": my_queue[3],
        "position_in_queue": position if my_queue[3] == "waiting" else None,
        "total_waiting": total_waiting,
    }


@booking_router.get("/concerts")
def get_concerts():
    """
    ดึงรายชื่อคอนเสิร์ตทั้งหมด พร้อมคำนวณสถานะสดจากเวลาปัจจุบันใน Database
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, artist, venue, address, concert_datetime,
                  CASE 
                    WHEN status = 'cancelled' THEN 'cancelled'
                    WHEN status = 'draft' THEN 'draft'
                    WHEN NOW() < sale_open_at THEN 'upcoming'
                    WHEN (NOW() >= sale_open_at AND (sale_close_at IS NULL OR NOW() <= sale_close_at)) THEN 'on_sale'
                    ELSE 'closed'
                  END as dynamic_status,
                  image_url
                FROM concert
                ORDER BY concert_datetime DESC
                """
            )
            rows = cur.fetchall()

    return [
        {
            "concert_id": r[0],
            "title": r[1],
            "artist": r[2],
            "venue": r[3],
            "address": r[4],
            "concert_datetime": r[5].isoformat() if r[5] else None,
            "status": r[6],
            "image_url": r[7],
        }
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Phase 4 — Seat Selection & Booking
# ---------------------------------------------------------------------------


@booking_router.get("/concerts/{concert_id}/zones")
def get_zones(concert_id: int):
    """
    แสดงโซนทั้งหมดของ concert พร้อมจำนวนที่นั่งว่าง
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT z.id, z.zone_name, z.price, z.total_seats, z.is_active,
                       COUNT(s.id) FILTER (WHERE s.status = 'available') AS available_count
                FROM zone z
                LEFT JOIN seat s ON s.zone_id = z.id
                WHERE z.concert_id = %s
                GROUP BY z.id, z.zone_name, z.price, z.total_seats, z.is_active
                ORDER BY z.price DESC
                """,
                (concert_id,),
            )
            rows = cur.fetchall()

    return [
        {
            "zone_id": r[0],
            "zone_name": r[1],
            "price": float(r[2]),
            "total_seats": r[3],
            "is_active": r[4],
            "available_count": r[5],
        }
        for r in rows
    ]


@booking_router.get("/concerts/{concert_id}/zones/{zone_id}/seats")
def get_seats(concert_id: int, zone_id: int):
    """
    แสดงที่นั่งทั้งหมดในโซน (พร้อมสถานะ available/locked/sold)
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT s.id, s.seat_row, s.seat_number, s.status
                FROM seat s
                JOIN zone z ON z.id = s.zone_id
                WHERE s.zone_id = %s AND z.concert_id = %s
                ORDER BY s.seat_row, s.seat_number
                """,
                (zone_id, concert_id),
            )
            rows = cur.fetchall()

    return [
        {"seat_id": r[0], "seat_row": r[1], "seat_number": r[2], "status": r[3]}
        for r in rows
    ]


# ---------------------------------------------------------------------------
# POST /booking/book — Seat Soft Lock + Create Booking (Transaction)
# ---------------------------------------------------------------------------


class BookBody(BaseModel):
    concert_id: int
    seat_ids: list[int]  # ที่นั่งที่ต้องการจอง
    delivery_type: str = "digital"  # digital | pickup | postal


@booking_router.post("/book", status_code=status.HTTP_201_CREATED)
def book_seats(body: BookBody, current_user: CurrentUser):
    """
    จองที่นั่ง (Phase 4)

    Flow:
    1. ตรวจสอบสิทธิ์ (customer + admitted queue)
    2. BEGIN transaction
    3. SELECT seat FOR UPDATE → เช็ก status='available'
    4. UPDATE seat → 'locked'
    5. INSERT booking (pending, expired_at = NOW()+15min)
    6. INSERT ticket per seat
    7. COMMIT
    """
    if current_user["role"] != "customer":
        raise HTTPException(status_code=403, detail="เฉพาะลูกค้าเท่านั้น")

    customer_profile_id = current_user.get("customer_profile_id")
    if not customer_profile_id:
        raise HTTPException(status_code=400, detail="ไม่พบ customer profile")

    if not body.seat_ids:
        raise HTTPException(status_code=400, detail="ต้องเลือกที่นั่งอย่างน้อย 1 ที่")

    with get_db_connection() as conn:
        try:
            with conn.cursor() as cur:
                fix_all_sequences(cur)
                # เช็ก admitted queue
                cur.execute(
                    """
                    SELECT id FROM queue_session
                    WHERE customer_id = %s AND concert_id = %s AND status = 'admitted'
                    """,
                    (customer_profile_id, body.concert_id),
                )
                if not cur.fetchone():
                    raise HTTPException(
                        status_code=403,
                        detail="คุณต้อง admit เข้าคิวก่อนจึงจะจองได้",
                    )

                # --- Lock seats ด้วย SELECT FOR UPDATE ---
                placeholders = ",".join(["%s"] * len(body.seat_ids))
                cur.execute(
                    f"""
                    SELECT s.id, s.status, z.price, z.concert_id
                    FROM seat s
                    JOIN zone z ON z.id = s.zone_id
                    WHERE s.id IN ({placeholders})
                    FOR UPDATE
                    """,
                    body.seat_ids,
                )
                seats = cur.fetchall()

                if len(seats) != len(body.seat_ids):
                    raise HTTPException(status_code=404, detail="ไม่พบที่นั่งที่เลือกบางรายการ")

                # เช็กว่าทุกที่นั่งอยู่ใน concert เดียวกัน + available
                unavailable = []
                total_amount = 0.0
                for seat in seats:
                    if seat[3] != body.concert_id:
                        raise HTTPException(
                            status_code=400, detail=f"seat {seat[0]} ไม่ใช่ของ concert นี้"
                        )
                    if seat[1] != "available":
                        unavailable.append(seat[0])
                    total_amount += float(seat[2])

                if unavailable:
                    raise HTTPException(
                        status_code=409,
                        detail=f"ที่นั่ง {unavailable} ถูกจองแล้ว กรุณาเลือกใหม่",
                    )

                # UPDATE seat → locked
                cur.execute(
                    f"UPDATE seat SET status = 'locked' WHERE id IN ({placeholders})",
                    body.seat_ids,
                )

                # INSERT booking
                expired_at = datetime.now(timezone.utc) + timedelta(minutes=15)
                cur.execute(
                    """
                    INSERT INTO booking
                      (customer_id, concert_id, expired_at, total_amount, total_tickets, status, delivery_type)
                    VALUES (%s, %s, %s, %s, %s, 'pending', %s)
                    RETURNING id
                    """,
                    (
                        customer_profile_id,
                        body.concert_id,
                        expired_at,
                        total_amount,
                        len(body.seat_ids),
                        body.delivery_type,
                    ),
                )
                booking_id = cur.fetchone()[0]

                # INSERT ticket per seat
                for seat_id in body.seat_ids:
                    import hashlib, secrets

                    qr_hash = hashlib.sha256(
                        f"TKT-{booking_id}-{seat_id}-{secrets.token_hex(8)}".encode()
                    ).hexdigest()
                    cur.execute(
                        "INSERT INTO ticket (seat_id, booking_id, qr_hash) VALUES (%s, %s, %s)",
                        (seat_id, booking_id, qr_hash),
                    )

            conn.commit()

        except HTTPException:
            conn.rollback()
            raise
        except Exception as e:
            conn.rollback()
            raise HTTPException(
                status_code=500, detail=f"เกิดข้อผิดพลาดในการจอง: {str(e)}"
            )

    return {
        "message": "จองสำเร็จ กรุณาชำระเงินภายใน 15 นาที",
        "booking_id": booking_id,
        "total_amount": total_amount,
        "seat_count": len(body.seat_ids),
        "expired_at": expired_at.isoformat(),
    }


@booking_router.get("/my")
def my_bookings(current_user: CurrentUser):
    """ดูประวัติการจองของตัวเอง (ใช้ vw_booking_summary)"""
    customer_profile_id = current_user.get("customer_profile_id")
    if not customer_profile_id:
        raise HTTPException(status_code=400, detail="ไม่พบ customer profile")

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT b.id, b.concert_id, c.title, c.concert_datetime, c.venue, c.address,
                       b.total_tickets, b.total_amount, b.status, b.created_at
                FROM booking b
                JOIN concert c ON c.id = b.concert_id
                WHERE b.customer_id = %s
                ORDER BY b.created_at DESC
                """,
                (customer_profile_id,),
            )
            rows = cur.fetchall()

    return [
        {
            "booking_id": r[0],
            "concert_id": r[1],
            "concert_title": r[2],
            "concert_datetime": r[3].isoformat() if r[3] else None,
            "venue": r[4],
            "address": r[5],
            "total_tickets": r[6],
            "total_amount": float(r[7]) if r[7] else 0,
            "status": r[8],
            "created_at": r[9].isoformat() if r[9] else None,
        }
        for r in rows
    ]


@booking_router.get("/{booking_id}/tickets")
def get_booking_tickets(booking_id: int, current_user: CurrentUser):
    """ดึงข้อมูลตั๋วรายใบใน Booking (รวม qr_hash)"""
    customer_profile_id = current_user.get("customer_profile_id")
    if not customer_profile_id:
        raise HTTPException(status_code=400, detail="ไม่พบ customer profile")

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # เช็คว่าเป็นเจ้าของ booking จริงไหม
            cur.execute(
                "SELECT id FROM booking WHERE id = %s AND customer_id = %s",
                (booking_id, customer_profile_id)
            )
            if not cur.fetchone():
                raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์เข้าถึงตั๋วใน Booking นี้")

            cur.execute(
                """
                SELECT t.id, t.qr_hash, s.seat_number, z.zone_name, t.is_used
                FROM ticket t
                JOIN seat s ON t.seat_id = s.id
                JOIN zone z ON s.zone_id = z.id
                WHERE t.booking_id = %s
                """,
                (booking_id,)
            )
            rows = cur.fetchall()

    return [
        {
            "ticket_id": r[0],
            "qr_hash": r[1],
            "seat_number": r[2],
            "zone_name": r[3],
            "is_used": r[4]
        }
        for r in rows
    ]


@booking_router.post("/{booking_id}/confirm")
def confirm_booking(booking_id: int, current_user: CurrentUser):
    """
    Stub สำหรับยืนยันการชำระ (รอ A3 webhook ที่แท้จริง)
    เปลี่ยน booking → paid, seat → sold
    """
    customer_profile_id = current_user.get("customer_profile_id")

    with get_db_connection() as conn:
        try:
            with conn.cursor() as cur:
                # ดึง booking + ตรวจสิทธิ์
                cur.execute(
                    "SELECT customer_id, concert_id, status, total_amount FROM booking WHERE id = %s FOR UPDATE",
                    (booking_id,),
                )
                booking = cur.fetchone()
                if not booking:
                    raise HTTPException(status_code=404, detail="ไม่พบ booking")
                if booking[0] != customer_profile_id:
                    raise HTTPException(status_code=403, detail="ไม่ใช่ booking ของคุณ")
                if booking[2] not in ["pending", "locked"]:
                    raise HTTPException(
                        status_code=400,
                        detail=f"booking สถานะ '{booking[2]}' ไม่สามารถ confirm ได้",
                    )

                concert_id = booking[1]
                total_amount = booking[3]

                cur.execute(
                    """
                    SELECT id, transaction_ref
                    FROM payment
                    WHERE booking_id = %s AND status = 'pending'
                    ORDER BY created_at DESC LIMIT 1
                    """,
                    (booking_id,),
                )
                pending_payment = cur.fetchone()

                if pending_payment:
                    payment_id, transaction_ref = pending_payment
                    cur.execute(
                        """
                        UPDATE payment
                        SET status = %s,
                            method = %s,
                            paid_at = NOW(),
                            expired_at = NULL
                        WHERE id = %s
                        RETURNING id, transaction_ref
                        """,
                        ("paid", "qr_code", payment_id),
                    )
                    payment_id, transaction_ref = cur.fetchone()
                else:
                    transaction_ref = f"TX-MANUAL-{booking_id}-{int(datetime.now(timezone.utc).timestamp())}-{secrets.token_hex(4)}"
                    cur.execute(
                        """
                        INSERT INTO payment
                          (booking_id, amount, transaction_ref, method, status, expired_at, paid_at)
                        VALUES (%s, %s, %s, 'qr_code', 'paid', NULL, NOW())
                        RETURNING id, transaction_ref
                        """,
                        (booking_id, total_amount, transaction_ref),
                    )
                    payment_id, transaction_ref = cur.fetchone()

                cur.execute(
                    """
                    INSERT INTO finance
                      (concert_id, booking_id, type, amount, description)
                    VALUES (%s, %s, 'income', %s, 'manual confirm stub')
                    """,
                    (concert_id, booking_id, total_amount),
                )

                # อัปเดต booking → paid
                cur.execute(
                    "UPDATE booking SET status = 'paid' WHERE id = %s",
                    (booking_id,),
                )

                # อัปเดต seat → sold
                cur.execute(
                    """
                    UPDATE seat SET status = 'sold'
                    WHERE id IN (
                        SELECT seat_id FROM ticket WHERE booking_id = %s
                    )
                    """,
                    (booking_id,),
                )

                # อัปเดต queue → completed
                cur.execute(
                    """
                    UPDATE queue_session SET status = 'completed'
                     WHERE customer_id = %s
                       AND concert_id = (SELECT concert_id FROM booking WHERE id = %s)
                       AND status = 'admitted'
                     """,
                    (customer_profile_id, booking_id),
                )

            conn.commit()

        except HTTPException:
            conn.rollback()
            raise
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))

    return {
        "message": "ยืนยันการจองสำเร็จ",
        "booking_id": booking_id,
        "status": "paid",
        "payment_id": payment_id,
        "transaction_ref": transaction_ref,
    }


# ---------------------------------------------------------------------------
# Zone-closure voucher: Free upgrade (rebook) into an active zone
# ---------------------------------------------------------------------------


class RebookRequestBody(BaseModel):
    new_seat_ids: list[int] = Field(..., min_length=1, max_length=20)


@booking_router.post("/{booking_id}/rebook")
def rebook_zone_closure(
    booking_id: int, body: RebookRequestBody, current_user: CurrentUser
):
    """
    Paid upgrade flow: ย้ายไปนั่งโซนที่ "แพงกว่าเดิม" และจ่ายส่วนต่าง.
    - booking ต้องเป็น 'zone_closed_action_required' และเป็นของ user เอง
    - new_seat_ids ต้องอยู่ในโซน active, concert เดียวกัน, status='available'
    - new_total ต้องมากกว่า original_total (รับเฉพาะ upgrade ที่แพงกว่า)
    - transaction: lock seats → DELETE ticket เก่า → free seat เก่า → seat ใหม่ → 'locked'
      → INSERT ticket ใหม่ → booking.total_amount = new_total, status='pending', expired_at=15min
    - คืน difference_amount เพื่อให้ user เข้า payment flow ต่อจ่ายส่วนต่าง
      (payment.amount จะคำนวณจาก booking.total_amount - sum(payment paid))
    """
    if current_user["role"] != "customer":
        raise HTTPException(status_code=403, detail="เฉพาะลูกค้าเท่านั้น")

    customer_profile_id = current_user.get("customer_profile_id")
    if not customer_profile_id:
        raise HTTPException(status_code=400, detail="ไม่พบ customer profile")

    new_seat_ids = list(dict.fromkeys(body.new_seat_ids))
    if len(new_seat_ids) != len(body.new_seat_ids):
        raise HTTPException(status_code=400, detail="new_seat_ids มีที่นั่งซ้ำ")

    with get_db_connection() as conn:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, customer_id, concert_id, status, total_amount
                    FROM booking WHERE id = %s FOR UPDATE
                    """,
                    (booking_id,),
                )
                booking = cur.fetchone()
                if not booking:
                    raise HTTPException(status_code=404, detail="ไม่พบ booking")

                b_id, b_customer_id, b_concert_id, b_status, b_original_total = booking
                if b_customer_id != customer_profile_id:
                    raise HTTPException(status_code=403, detail="ไม่ใช่ booking ของคุณ")
                if b_status != "zone_closed_action_required":
                    raise HTTPException(
                        status_code=409,
                        detail=f"booking สถานะ '{b_status}' ไม่ใช่ voucher จากการปิดโซน",
                    )

                cur.execute(
                    "SELECT seat_id FROM ticket WHERE booking_id = %s ORDER BY seat_id",
                    (b_id,),
                )
                old_seat_ids = [r[0] for r in cur.fetchall()]
                if not old_seat_ids:
                    raise HTTPException(
                        status_code=409, detail="ไม่พบ ticket เดิมของ booking นี้"
                    )
                if len(new_seat_ids) != len(old_seat_ids):
                    raise HTTPException(
                        status_code=409,
                        detail=f"จำนวนที่นั่งใหม่ ({len(new_seat_ids)}) ต้องเท่ากับ ticket เดิม ({len(old_seat_ids)})",
                    )
                if set(new_seat_ids) & set(old_seat_ids):
                    raise HTTPException(
                        status_code=409,
                        detail="new_seat_ids ซ้ำกับที่นั่งเดิม",
                    )

                # Lock เก่า+ใหม่ พร้อมกัน เรียง id กันชน deadlock
                all_seat_ids = sorted(set(old_seat_ids) | set(new_seat_ids))
                placeholders = ",".join(["%s"] * len(all_seat_ids))
                cur.execute(
                    f"""
                    SELECT s.id, s.status, s.zone_id, z.is_active, z.concert_id, z.price
                    FROM seat s
                    JOIN zone z ON z.id = s.zone_id
                    WHERE s.id IN ({placeholders})
                    ORDER BY s.id
                    FOR UPDATE
                    """,
                    all_seat_ids,
                )
                rows = cur.fetchall()
                seat_map = {r[0]: r for r in rows}

                missing = [sid for sid in all_seat_ids if sid not in seat_map]
                if missing:
                    raise HTTPException(status_code=404, detail=f"ไม่พบที่นั่ง {missing}")

                # Validate เฉพาะที่นั่งใหม่ + รวม new_total
                from decimal import Decimal as _Decimal
                new_total = _Decimal("0")
                for sid in new_seat_ids:
                    _, s_status, _, z_active, z_concert, z_price = seat_map[sid]
                    if z_concert != b_concert_id:
                        raise HTTPException(
                            status_code=409,
                            detail=f"seat {sid} ไม่ใช่ของ concert เดียวกับ booking",
                        )
                    if not z_active:
                        raise HTTPException(
                            status_code=409,
                            detail=f"seat {sid} อยู่ในโซนที่ถูกปิด",
                        )
                    if s_status != "available":
                        raise HTTPException(
                            status_code=409,
                            detail=f"seat {sid} ไม่ว่าง (status='{s_status}')",
                        )
                    new_total += _Decimal(z_price)

                # Upgrade-only: new_total ต้องมากกว่า original_total เสมอ
                original_total = _Decimal(b_original_total)
                if new_total <= original_total:
                    raise HTTPException(
                        status_code=409,
                        detail=(
                            f"ที่นั่งใหม่ราคารวม {new_total} ไม่สูงกว่ายอดเดิม {original_total} "
                            "— upgrade ต้องเลือกโซนที่แพงกว่าเดิมเท่านั้น"
                        ),
                    )
                difference_amount = new_total - original_total

                # DELETE ticket เดิม
                cur.execute("DELETE FROM ticket WHERE booking_id = %s", (b_id,))

                # Free seat เดิม
                old_placeholders = ",".join(["%s"] * len(old_seat_ids))
                cur.execute(
                    f"UPDATE seat SET status = 'available' WHERE id IN ({old_placeholders})",
                    old_seat_ids,
                )

                # lock seat ใหม่ → 'locked' (รอ user จ่ายส่วนต่างใน /payment)
                new_placeholders = ",".join(["%s"] * len(new_seat_ids))
                cur.execute(
                    f"UPDATE seat SET status = 'locked' WHERE id IN ({new_placeholders})",
                    new_seat_ids,
                )

                # INSERT ticket ใหม่
                new_ticket_ids = []
                for seat_id in new_seat_ids:
                    qr_hash = hashlib.sha256(
                        f"TKT-{b_id}-{seat_id}-{secrets.token_hex(8)}".encode()
                    ).hexdigest()
                    cur.execute(
                        """
                        INSERT INTO ticket (seat_id, booking_id, qr_hash)
                        VALUES (%s, %s, %s) RETURNING id
                        """,
                        (seat_id, b_id, qr_hash),
                    )
                    new_ticket_ids.append(cur.fetchone()[0])

                # booking เข้าสู่ payment flow รอบใหม่: total_amount = new_total
                # (ยอดรวมใหม่ทั้งก้อน — เพื่อให้ vw_concert_sales / dashboard
                # รายงานรายได้ครบทั้งก้อนหลัง upgrade), status='pending',
                # expired_at=NOW()+15min. ส่วนต่างที่ลูกค้าต้องจ่ายเพิ่มจะคำนวณ
                # ใน /payment/generate-qr จาก total_amount - sum(payment paid).
                # payment เดิม (paid) ยังเก็บไว้ในตาราง payment เพื่อ accounting.
                new_expired_at = datetime.now(timezone.utc) + timedelta(minutes=15)
                cur.execute(
                    """
                    UPDATE booking
                    SET status = 'pending',
                        total_amount = %s,
                        total_tickets = %s,
                        expired_at = %s
                    WHERE id = %s AND status = 'zone_closed_action_required'
                    """,
                    (new_total, len(new_seat_ids), new_expired_at, b_id),
                )
                if cur.rowcount != 1:
                    raise HTTPException(
                        status_code=409, detail="booking ถูกเปลี่ยนสถานะไปแล้ว"
                    )

            conn.commit()

        except HTTPException:
            conn.rollback()
            raise
        except Exception as exc:
            conn.rollback()
            raise HTTPException(status_code=500, detail=f"rebook ไม่สำเร็จ: {exc}")

    return {
        "message": "ย้ายที่นั่งสำเร็จ — กรุณาชำระส่วนต่างภายใน 15 นาที",
        "booking_id": b_id,
        "status": "pending",
        "new_seat_ids": new_seat_ids,
        "new_ticket_ids": new_ticket_ids,
        "original_total": f"{original_total:.2f}",
        "new_total": f"{new_total:.2f}",
        "difference_amount": f"{difference_amount:.2f}",
        "expired_at": new_expired_at.isoformat(),
    }
