"""
routes/organizer.py — Organizer Endpoints
------------------------------------------
GET    /organizer/concerts/{concert_id}/queues  ดูรายชื่อคิวสำหรับส่ง Admit
POST   /organizer/queues/{queue_id}/admit       เปลี่ยนสถานะคิวลูกค้าเป็น admitted
PATCH  /organizer/queues/{queue_id}/priority    แก้ไขคะแนน priority (location_score)
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from models import get_db_connection
from routes.deps import CurrentUser

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
            from models import fix_all_sequences
            fix_all_sequences(cur)

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
