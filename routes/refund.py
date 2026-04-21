"""
routes/refund.py — Refund Request Form (Phase 5)
-------------------------------------------------
POST /api/v1/refunds/request
  ลูกค้ายื่น "ฟอร์มขอคืนเงิน" ภายใน 7 วันหลังชำระเงินสำเร็จ.
  ระบบเก็บข้อมูลบัญชีธนาคาร + เหตุผลไว้ให้ staff/organizer โอนมือภายหลัง.

Idempotency:
  1. refund.UNIQUE(payment_id) + INSERT ... ON CONFLICT DO NOTHING
  2. SELECT booking FOR UPDATE — กันกดซับมิตซ้ำใน 2 tab
  3. Status guard booking = 'paid' — ครอบเคส refund_pending/cancelled ไปแล้ว
"""
import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from models import get_db_connection
from routes.deps import CurrentUser

logger = logging.getLogger("tooket-ther")

refund_router = APIRouter(prefix="/api/v1/refunds", tags=["refunds"])

REFUND_WINDOW_DAYS = 7


class RefundRequestBody(BaseModel):
    booking_id:     int
    bank_name:      str = Field(..., min_length=1, max_length=100)
    account_number: str = Field(..., min_length=5, max_length=30)
    account_name:   str = Field(..., min_length=1, max_length=150)
    reason:         Optional[str] = Field(None, max_length=1000)


@refund_router.post("/request")
def request_refund(body: RefundRequestBody, current_user: CurrentUser):
    """
    ยื่นคำขอคืนเงิน (form submission — ไม่ได้โอนเงินทันที).
    - booking ต้องเป็น 'paid' และเป็นของ user เอง
    - payment.paid_at ต้องไม่เกิน 7 วัน
    - transaction: lock booking → insert refund (unique per payment_id) →
      flip booking=refund_pending → seat→available → finance -row
    """
    if current_user["role"] != "customer":
        raise HTTPException(status_code=403, detail="เฉพาะลูกค้าเท่านั้น")

    customer_profile_id = current_user.get("customer_profile_id")
    if not customer_profile_id:
        raise HTTPException(status_code=400, detail="ไม่พบ customer profile")

    with get_db_connection() as conn:
        try:
            with conn.cursor() as cur:
                # Lock booking
                cur.execute(
                    """
                    SELECT id, customer_id, concert_id, status, total_amount
                    FROM booking WHERE id = %s FOR UPDATE
                    """,
                    (body.booking_id,),
                )
                booking = cur.fetchone()
                if not booking:
                    raise HTTPException(status_code=404, detail="ไม่พบ booking")

                b_id, b_customer_id, concert_id, b_status, total_amount = booking

                if b_customer_id != customer_profile_id:
                    raise HTTPException(status_code=403, detail="ไม่ใช่ booking ของคุณ")
                if b_status != "paid":
                    raise HTTPException(
                        status_code=400,
                        detail=f"booking สถานะ '{b_status}' ไม่สามารถขอคืนเงินได้",
                    )

                # ดึง payment ที่ชำระสำเร็จของ booking
                cur.execute(
                    """
                    SELECT id, amount, paid_at
                    FROM payment
                    WHERE booking_id = %s AND status = 'paid'
                    ORDER BY paid_at DESC LIMIT 1
                    """,
                    (b_id,),
                )
                payment = cur.fetchone()
                if not payment:
                    raise HTTPException(
                        status_code=400,
                        detail="ไม่พบ payment ที่ชำระสำเร็จสำหรับ booking นี้",
                    )

                payment_id, paid_amount, paid_at = payment

                # 7-day window (อิง paid_at จาก gateway confirm)
                if paid_at is None:
                    raise HTTPException(status_code=400, detail="payment ไม่มีเวลา paid_at")

                now_utc = datetime.now(timezone.utc)
                paid_at_utc = paid_at.replace(tzinfo=timezone.utc)
                if now_utc - paid_at_utc > timedelta(days=REFUND_WINDOW_DAYS):
                    raise HTTPException(
                        status_code=400,
                        detail=f"เกิน {REFUND_WINDOW_DAYS} วันหลังชำระเงิน ไม่สามารถขอคืนเงินได้",
                    )

                # INSERT refund idempotent via UNIQUE(payment_id)
                cur.execute(
                    """
                    INSERT INTO refund
                      (payment_id, amount, status, bank_name, account_number, account_name, reason)
                    VALUES (%s, %s, 'pending_transfer', %s, %s, %s, %s)
                    ON CONFLICT (payment_id) DO NOTHING
                    RETURNING id
                    """,
                    (
                        payment_id, paid_amount,
                        body.bank_name, body.account_number, body.account_name, body.reason,
                    ),
                )
                inserted = cur.fetchone()

                if inserted is None:
                    # ยื่นไว้แล้ว
                    cur.execute(
                        "SELECT id, status FROM refund WHERE payment_id = %s",
                        (payment_id,),
                    )
                    existing = cur.fetchone()
                    conn.rollback()
                    raise HTTPException(
                        status_code=409,
                        detail={
                            "message": "คำขอคืนเงินถูกยื่นไว้แล้ว",
                            "refund_id": existing[0] if existing else None,
                            "status": existing[1] if existing else None,
                        },
                    )

                refund_id = inserted[0]

                # Side effects: booking → refund_pending, seat คืนให้ขายใหม่, finance บันทึก
                cur.execute(
                    "UPDATE booking SET status = 'refund_pending' WHERE id = %s",
                    (b_id,),
                )
                cur.execute(
                    """
                    UPDATE seat SET status = 'available'
                    WHERE id IN (SELECT seat_id FROM ticket WHERE booking_id = %s)
                    """,
                    (b_id,),
                )
                cur.execute(
                    """
                    INSERT INTO finance
                      (concert_id, booking_id, type, amount, description)
                    VALUES (%s, %s, 'refund', %s, 'refund requested')
                    """,
                    (concert_id, b_id, paid_amount),
                )

            conn.commit()
            logger.info(
                "Refund requested: refund_id=%s booking=%s payment=%s amount=%s",
                refund_id, b_id, payment_id, paid_amount,
            )

        except HTTPException:
            conn.rollback()
            raise
        except Exception as exc:
            conn.rollback()
            logger.exception("refund request error: %s", exc)
            raise HTTPException(status_code=500, detail=f"ยื่นคำขอคืนเงินไม่สำเร็จ: {exc}")

    return {
        "message": "ยื่นคำขอคืนเงินสำเร็จ",
        "refund_id": refund_id,
        "booking_id": b_id,
        "amount": f"{Decimal(paid_amount):.2f}",
        "status": "pending_transfer",
    }
