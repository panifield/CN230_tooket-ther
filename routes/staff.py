"""
routes/staff.py — Staff Endpoints
----------------------------------
POST /staff/verify-ticket
"""
import logging
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from models import get_db_connection
from routes.deps import CurrentUser

logger = logging.getLogger("tooket-ther")

staff_router = APIRouter(prefix="/staff", tags=["staff"])

class VerifyTicketBody(BaseModel):
    qr_hash: str

@staff_router.post("/verify-ticket")
def verify_ticket(body: VerifyTicketBody, current_user: CurrentUser):
    if current_user.get("role") != "staff":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="เฉพาะ Gate Staff เท่านั้น",
        )
    
    staff_profile_id = current_user.get("staff_profile_id")
    if not staff_profile_id:
        raise HTTPException(status_code=400, detail="ไม่พบข้อมูล staff profile ของคุณ")

    with get_db_connection() as conn:
        try:
            with conn.cursor() as cur:
                if body.qr_hash.isdigit():
                    cur.execute(
                        """
                        SELECT t.id, t.is_used, b.status, s.seat_number, z.zone_name, c.title
                        FROM ticket t
                        JOIN booking b ON t.booking_id = b.id
                        JOIN seat s ON t.seat_id = s.id
                        JOIN zone z ON s.zone_id = z.id
                        JOIN concert c ON b.concert_id = c.id
                        WHERE t.id = %s OR t.qr_hash = %s
                        FOR UPDATE OF t
                        """,
                        (int(body.qr_hash), body.qr_hash)
                    )
                else:
                    cur.execute(
                        """
                        SELECT t.id, t.is_used, b.status, s.seat_number, z.zone_name, c.title
                        FROM ticket t
                        JOIN booking b ON t.booking_id = b.id
                        JOIN seat s ON t.seat_id = s.id
                        JOIN zone z ON s.zone_id = z.id
                        JOIN concert c ON b.concert_id = c.id
                        WHERE t.qr_hash = %s
                        FOR UPDATE OF t
                        """,
                        (body.qr_hash,)
                    )
                
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="ไม่พบตั๋วใบนี้ในระบบ")
                
                ticket_id, is_used, booking_status, seat_number, zone_name, concert_title = row
                
                if booking_status != 'paid':
                    raise HTTPException(status_code=400, detail=f"ตั๋วใบนี้อยู่ในสถานะ booking: {booking_status}")
                
                if is_used:
                    raise HTTPException(status_code=409, detail="ตั๋วใบนี้ถูกใช้งานไปแล้ว (Duplicate Entry)")

                # Mark as used
                cur.execute(
                    "UPDATE ticket SET is_used = TRUE WHERE id = %s",
                    (ticket_id,)
                )
                
                # Insert ticket_checkin
                cur.execute(
                    """
                    INSERT INTO ticket_checkin (staff_id, ticket_id, status)
                    VALUES (%s, %s, 'checked')
                    """,
                    (staff_profile_id, ticket_id)
                )
                
            conn.commit()
            
            return {
                "message": "Verify ตั๋วสำเร็จ อนุญาตให้เข้างานได้",
                "ticket_id": ticket_id,
                "concert_title": concert_title,
                "zone_name": zone_name,
                "seat_number": seat_number
            }

        except HTTPException:
            conn.rollback()
            raise
        except Exception as exc:
            conn.rollback()
            logger.exception("verify_ticket error: %s", exc)
            raise HTTPException(status_code=500, detail=f"ตรวจสอบตั๋วไม่สำเร็จ: {exc}")
