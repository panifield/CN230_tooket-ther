"""
routes/organizer.py — Organizer Endpoints
------------------------------------------
GET    /organizer/concerts/{concert_id}/queues  ดูรายชื่อคิวสำหรับส่ง Admit
POST   /organizer/queues/{queue_id}/admit       เปลี่ยนสถานะคิวลูกค้าเป็น admitted
PATCH  /organizer/queues/{queue_id}/priority    แก้ไขคะแนน priority (location_score)
"""
import logging
from decimal import Decimal

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from pydantic import BaseModel

from models import get_db_connection
from routes.deps import CurrentUser

logger = logging.getLogger("tooket-ther")

organizer_router = APIRouter(prefix="/organizer", tags=["organizer"])


def _check_organizer_role(current_user: CurrentUser):
    if current_user.get("role") != "organizer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="เฉพาะ Organizer เท่านั้น",
        )


@organizer_router.get("/concerts/{concert_id}/queues")
def get_concert_queues(concert_id: int, current_user: CurrentUser):
    """
    ดึงรายชื่อลูกค้าที่อยู่ในคิวสำหรับคอนเสิร์ตนี้ทั้งหมด
    จัดเรียงตามลำดับ Priority และเวลาการเข้าคิว
    """
    _check_organizer_role(current_user)

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT q.id, u.name, u.email, q.priority_score, q.status, q.entered_at
                FROM queue_session q
                JOIN customer_profile cp ON q.customer_id = cp.id
                JOIN users u ON cp.user_id = u.id
                WHERE q.concert_id = %s
                ORDER BY q.priority_score DESC, q.entered_at ASC
                """,
                (concert_id,)
            )
            rows = cur.fetchall()

    return [
        {
            "queue_id": r[0],
            "customer_name": r[1],
            "customer_email": r[2],
            "priority_score": r[3],
            "status": r[4],
            "entered_at": r[5].isoformat() if r[5] else None
        }
        for r in rows
    ]


@organizer_router.post("/queues/{queue_id}/admit")
def admit_customer_queue(queue_id: int, current_user: CurrentUser):
    """
    Organizer เปลี่ยนสถานะคิวจาก waiting เป็น admitted
    """
    _check_organizer_role(current_user)

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE queue_session
                SET status = 'admitted', admitted_at = NOW()
                WHERE id = %s AND status = 'waiting'
                RETURNING id
                """,
                (queue_id,)
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="แอดมิทไม่ได้ คิวนี้อาจจะไม่ได้อยู่ในสถานะ waiting หรือคิวไม่มีอยู่จริง"
                )
        conn.commit()

    return {"message": f"Admit คิวหมายเลข {queue_id} สำเร็จแล้ว"}


class UpdatePriorityBody(BaseModel):
    priority_score: int


@organizer_router.patch("/queues/{queue_id}/priority")
def update_queue_priority(queue_id: int, body: UpdatePriorityBody, current_user: CurrentUser):
    """
    Organizer จัดการแก้ไขตัวเลข priority_score ให้ลูกค้าโดยตรง
    """
    _check_organizer_role(current_user)

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE queue_session
                SET priority_score = %s
                WHERE id = %s
                RETURNING id
                """,
                (body.priority_score, queue_id)
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="ไม่พบคิวที่ต้องการแก้ไข"
                )
        conn.commit()

    return {"message": f"อัปเดต Priority ของคิวที่ {queue_id} เป็น {body.priority_score} สำเร็จ"}

from datetime import datetime

class CreateConcertBody(BaseModel):
    title: str
    artist: str
    venue: str
    address: str
    concert_datetime: datetime
    sale_open_at: datetime
    sale_close_at: datetime = None
    status: str = "on_sale"

@organizer_router.post("/concerts", status_code=status.HTTP_201_CREATED)
def create_concert(body: CreateConcertBody, current_user: CurrentUser):
    """
    Organizer สร้างคอนเสิร์ตใหม่
    """
    _check_organizer_role(current_user)
    organizer_profile_id = current_user.get("organizer_profile_id")
    if not organizer_profile_id:
        raise HTTPException(status_code=400, detail="ไม่พบข้อมูล organizer profile ของคุณ")

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO concert
                  (organizer_id, title, artist, venue, address, concert_datetime, sale_open_at, sale_close_at, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (organizer_profile_id, body.title, body.artist, body.venue, body.address, 
                 body.concert_datetime, body.sale_open_at, body.sale_close_at, body.status)
            )
            concert_id = cur.fetchone()[0]
        conn.commit()

    return {"message": "สร้างคอนเสิร์ตสำเร็จ", "concert_id": concert_id}


@organizer_router.post("/concerts/{concert_id}/queues/auto_sort")
def auto_sort_queues(concert_id: int, current_user: CurrentUser):
    """
    Organizer ปรับ priority score ใหม่ โดยดูจาก address ของ Concert vs User
    (ตรงกัน = 100, ไม่ตรง = 10)
    """
    _check_organizer_role(current_user)

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # ดึง address ของ concert
            cur.execute("SELECT address FROM concert WHERE id = %s", (concert_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="ไม่พบคอนเสิร์ต")
            c_addr = row[0] or ""
            c_addr_lower = c_addr.strip().lower()

            # ดึง queue ที่กำลังรออยู่
            cur.execute(
                """
                SELECT q.id, u.address 
                FROM queue_session q
                JOIN customer_profile cp ON q.customer_id = cp.id
                JOIN users u ON cp.user_id = u.id
                WHERE q.concert_id = %s AND q.status = 'waiting'
                """, (concert_id,)
            )
            queues = cur.fetchall()

            updated_count = 0
            for q_id, u_addr in queues:
                u_addr_lower = (u_addr or "").strip().lower()
                # ให้คะแนนความสนใจพิเศษตามโซนที่อยู่ (address)
                score = 100 if (c_addr_lower and c_addr_lower in u_addr_lower) else 10
                
                cur.execute(
                    "UPDATE queue_session SET priority_score = %s WHERE id = %s",
                    (score, q_id)
                )
                updated_count += 1

        conn.commit()

    return {"message": f"เรียงคิวอัตโนมัติสำเร็จ (อัปเดตคะแนนใหม่ {updated_count} คิว)"}


# ---------------------------------------------------------------------------
# Zone closure — ปิดโซนเมื่อมีคนซื้อน้อย
# ---------------------------------------------------------------------------

def _mock_send_zone_closed_email(email: str, zone_name: str, concert_title: str, booking_id: int):
    """
    Mock email sender. แทนที่ด้วย SMTP/SES/SendGrid integration ทีหลัง.
    """
    logger.info(
        "[MOCK EMAIL] to=%s | subject='โซน %s ของคอนเสิร์ต %s ถูกปิด' | "
        "booking_id=%s | body='โซนที่คุณจองถูกปิดแล้ว กรุณา login "
        "เข้าระบบเพื่อเลือก 1) ขอคืนเงินเต็มจำนวน หรือ 2) เลือกที่นั่งใหม่ในโซนอื่นฟรี'",
        email, zone_name, concert_title, booking_id,
    )


@organizer_router.post("/zones/{zone_id}/close")
def close_zone(zone_id: int, background_tasks: BackgroundTasks, current_user: CurrentUser):
    """
    Organizer ปิดโซนที่มีคนซื้อน้อย (soft-delete):
    - zone.is_active = FALSE
    - seat ที่ยังไม่ sold → 'closed'
    - booking.status 'paid' ที่มี ticket ในโซนนี้ → 'zone_closed_action_required'
      (ใช้เป็น "voucher" ให้ user เลือก refund หรือ free upgrade)
    - queue email ลูกค้าที่ได้รับผลกระทบ (background task)
    """
    _check_organizer_role(current_user)
    organizer_profile_id = current_user.get("organizer_profile_id")
    if not organizer_profile_id:
        raise HTTPException(status_code=400, detail="ไม่พบ organizer profile ของคุณ")

    with get_db_connection() as conn:
        try:
            with conn.cursor() as cur:
                # Lock zone + ตรวจ ownership ผ่าน concert.organizer_id
                cur.execute(
                    """
                    SELECT z.id, z.zone_name, z.is_active, z.concert_id,
                           c.title, c.organizer_id
                    FROM zone z
                    JOIN concert c ON c.id = z.concert_id
                    WHERE z.id = %s
                    FOR UPDATE OF z
                    """,
                    (zone_id,),
                )
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="ไม่พบโซน")

                z_id, zone_name, is_active, concert_id, concert_title, owner_id = row

                if owner_id != organizer_profile_id:
                    raise HTTPException(status_code=403, detail="ไม่ใช่ organizer ของคอนเสิร์ตนี้")
                if not is_active:
                    raise HTTPException(status_code=400, detail="โซนนี้ถูกปิดไปแล้ว")

                # หา booking ที่ได้รับผลกระทบ (paid + มี ticket อยู่ในโซนนี้)
                cur.execute(
                    """
                    SELECT DISTINCT b.id, u.email
                    FROM booking b
                    JOIN ticket t ON t.booking_id = b.id
                    JOIN seat s ON s.id = t.seat_id
                    JOIN customer_profile cp ON cp.id = b.customer_id
                    JOIN users u ON u.id = cp.user_id
                    WHERE s.zone_id = %s AND b.status = 'paid'
                    """,
                    (z_id,),
                )
                affected = cur.fetchall()  # [(booking_id, email), ...]
                affected_booking_ids = [r[0] for r in affected]

                # ปิด zone
                cur.execute(
                    "UPDATE zone SET is_active = FALSE WHERE id = %s",
                    (z_id,),
                )

                # seat ที่ยังไม่ถูก sold → closed (sold เก็บสถานะไว้เป็น audit)
                cur.execute(
                    """
                    UPDATE seat SET status = 'closed'
                    WHERE zone_id = %s AND status IN ('available','locked')
                    """,
                    (z_id,),
                )
                seats_closed = cur.rowcount

                # booking ที่ได้รับผลกระทบ → zone_closed_action_required (voucher)
                if affected_booking_ids:
                    placeholders = ",".join(["%s"] * len(affected_booking_ids))
                    cur.execute(
                        f"""
                        UPDATE booking SET status = 'zone_closed_action_required'
                        WHERE id IN ({placeholders})
                        """,
                        affected_booking_ids,
                    )

            conn.commit()

        except HTTPException:
            conn.rollback()
            raise
        except Exception as exc:
            conn.rollback()
            logger.exception("close_zone error: %s", exc)
            raise HTTPException(status_code=500, detail=f"ปิดโซนไม่สำเร็จ: {exc}")

    # ส่งอีเมลแจ้ง (mock) หลัง commit — ถึงอีเมลล้มก็ไม่ rollback DB
    for booking_id, email in affected:
        background_tasks.add_task(
            _mock_send_zone_closed_email, email, zone_name, concert_title, booking_id,
        )

    logger.info(
        "Zone closed: zone_id=%s concert=%s affected_bookings=%d seats_closed=%d",
        z_id, concert_id, len(affected_booking_ids), seats_closed,
    )

    return {
        "message": "ปิดโซนสำเร็จ",
        "zone_id": z_id,
        "zone_name": zone_name,
        "concert_id": concert_id,
        "seats_closed": seats_closed,
        "affected_bookings": len(affected_booking_ids),
        "notifications_queued": len(affected),
    }


# ---------------------------------------------------------------------------
# Phase 6 — Organizer Dashboard (สรุปรายรับรายจ่ายรายวันของคอนเสิร์ต)
# ---------------------------------------------------------------------------

class DailyStat(BaseModel):
    date: str
    income: Decimal
    expense: Decimal
    net_profit: Decimal


class GrandTotals(BaseModel):
    total_income: Decimal
    total_expense: Decimal
    total_net_profit: Decimal


class DashboardResponse(BaseModel):
    concert_id: int
    daily_stats: list[DailyStat]
    grand_totals: GrandTotals


@organizer_router.get(
    "/concerts/{concert_id}/dashboard",
    response_model=DashboardResponse,
)
def get_concert_dashboard(concert_id: int, current_user: CurrentUser):
    """
    Phase 6 — สรุปรายรับ/รายจ่ายรายวันของคอนเสิร์ต (Asia/Bangkok timezone)
    - income: payment.status='paid' รวมตาม paid_at (แปลงเป็นเวลาไทยก่อน)
    - expense: refund ที่ยังไม่ถูก reject รวมตามเวลาคำขอ/อนุมัติ/เสร็จสิ้น
    """
    _check_organizer_role(current_user)
    organizer_profile_id = current_user.get("organizer_profile_id")
    if not organizer_profile_id:
        raise HTTPException(status_code=403, detail="ไม่พบ organizer profile")

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT organizer_id FROM concert WHERE id = %s",
                (concert_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="ไม่พบคอนเสิร์ต")
            if row[0] != organizer_profile_id:
                raise HTTPException(
                    status_code=403,
                    detail="ไม่ใช่ organizer ของคอนเสิร์ตนี้",
                )

            # ใช้ payment + refund แทน finance table เพราะ finance ไม่มี timestamp
            # สำหรับ group by วันได้ — แต่ยอดตรงกันเพราะ finance rows ถูก insert
            # ใน transaction เดียวกับ payment/refund (ดู routes/payment.py, routes/refund.py)
            cur.execute(
                """
                WITH income AS (
                    SELECT
                        (p.paid_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::date AS day,
                        SUM(p.amount) AS amount
                    FROM payment p
                    JOIN booking b ON b.id = p.booking_id
                    WHERE b.concert_id = %s
                      AND p.status = 'paid'
                      AND p.paid_at IS NOT NULL
                    GROUP BY day
                ),
                expense AS (
                    SELECT
                        (COALESCE(r.completed_at, r.approved_at, r.requested_at)
                            AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::date AS day,
                        SUM(r.amount) AS amount
                    FROM refund r
                    JOIN payment p ON p.id = r.payment_id
                    JOIN booking b ON b.id = p.booking_id
                    WHERE b.concert_id = %s
                      AND r.status <> 'rejected'
                    GROUP BY day
                )
                SELECT
                    COALESCE(i.day, e.day) AS day,
                    COALESCE(i.amount, 0) AS income,
                    COALESCE(e.amount, 0) AS expense
                FROM income i
                FULL OUTER JOIN expense e ON e.day = i.day
                ORDER BY day ASC
                """,
                (concert_id, concert_id),
            )
            rows = cur.fetchall()

    daily_stats = [
        DailyStat(
            date=day.isoformat(),
            income=income,
            expense=expense,
            net_profit=income - expense,
        )
        for (day, income, expense) in rows
    ]
    total_income = sum((d.income for d in daily_stats), Decimal("0"))
    total_expense = sum((d.expense for d in daily_stats), Decimal("0"))

    return DashboardResponse(
        concert_id=concert_id,
        daily_stats=daily_stats,
        grand_totals=GrandTotals(
            total_income=total_income,
            total_expense=total_expense,
            total_net_profit=total_income - total_expense,
        ),
    )
