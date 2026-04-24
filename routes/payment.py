"""
routes/payment.py — Payment Flow (Phase 5)
------------------------------------------
POST /api/v1/payments/generate-qr  — Frontend เรียกตอนกด Pay:
    เตรียม transaction_ref, pre-insert payment(status='pending'),
    คืน PromptPay QR payload ให้ frontend render.

POST /api/v1/payments/webhook       — Gateway เรียกเข้ามาแจ้งผล:
    UPDATE payment pending → paid/failed, ทำ side effect (seat/booking/queue/finance).

Idempotency: transaction_ref UNIQUE + UPDATE ... WHERE status='pending'
             + SELECT booking FOR UPDATE + short-circuit terminal state.
"""
import hmac
import hashlib
import json
import logging
import secrets
import time
from datetime import timezone
from decimal import Decimal
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, ValidationError

from config import Config
from models import get_db_connection
from routes.deps import CurrentUser

logger = logging.getLogger("tooket-ther")

payment_router = APIRouter(prefix="/api/v1/payments", tags=["payments"])


def _iso_utc(dt):
    """Serialize a DB-side naive TIMESTAMP (assumed UTC) as an ISO-8601 string
    with an explicit +00:00 offset, so the browser doesn't parse it as local."""
    if dt is None:
        return None
    return dt.replace(tzinfo=timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# PromptPay EMVCo QR payload builder
# ---------------------------------------------------------------------------

def _tlv(tag: str, value: str) -> str:
    return f"{tag}{len(value):02d}{value}"


def _crc16_ccitt(data: str) -> str:
    """CRC16/CCITT-FALSE (poly 0x1021, init 0xFFFF) — EMVCo tag 63."""
    crc = 0xFFFF
    for ch in data.encode("ascii"):
        crc ^= ch << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) & 0xFFFF if crc & 0x8000 else (crc << 1) & 0xFFFF
    return f"{crc:04X}"


def build_promptpay_payload(promptpay_id: str, amount: Decimal) -> str:
    """
    สร้างสตริง EMVCo QR สำหรับ PromptPay (dynamic QR, มียอดเงินกำหนด).
    promptpay_id: เบอร์โทร 10 หลัก (เริ่ม 0) หรือเลขบัตรประชาชน 13 หลัก.
    """
    digits = "".join(c for c in promptpay_id if c.isdigit())
    if len(digits) == 10 and digits.startswith("0"):
        # เบอร์มือถือ: ตัด 0 นำหน้า แล้วเติม 0066 (country code TH)
        target = "0066" + digits[1:]
    elif len(digits) == 13:
        target = digits
    else:
        raise ValueError("PROMPTPAY_ID ต้องเป็นเบอร์ 10 หลัก หรือเลขบัตร 13 หลัก")

    # tag 29: merchant account info (PromptPay AID + target)
    mai = _tlv("00", "A000000677010111") + _tlv(
        "01" if len(digits) == 13 else "01", target
    )
    # Note: sub-tag "01" = mobile number target, "02" = national ID — ตาม spec จริง
    # ต้องเลือกตาม type. ใช้ 01 สำหรับเบอร์, 02 สำหรับบัตร.
    if len(digits) == 13:
        mai = _tlv("00", "A000000677010111") + _tlv("02", target)
    else:
        mai = _tlv("00", "A000000677010111") + _tlv("01", target)

    amount_str = f"{Decimal(amount):.2f}"
    payload = (
        _tlv("00", "01")          # Payload Format Indicator
        + _tlv("01", "12")        # Point of Initiation: 12 = dynamic
        + _tlv("29", mai)         # Merchant Account Info (PromptPay)
        + _tlv("53", "764")       # Currency: THB
        + _tlv("54", amount_str)  # Amount
        + _tlv("58", "TH")        # Country
    )
    payload += "6304"  # CRC tag + length placeholder
    payload += _crc16_ccitt(payload)
    return payload


# ---------------------------------------------------------------------------
# POST /generate-qr  — Frontend-facing: เตรียม QR ก่อนจ่าย
# ---------------------------------------------------------------------------

class GenerateQrBody(BaseModel):
    booking_id: int
    method: Literal["qr_code"] = "qr_code"


@payment_router.post("/generate-qr")
def generate_qr(body: GenerateQrBody, current_user: CurrentUser):
    """
    สร้าง transaction_ref + PromptPay QR สำหรับ booking ที่ยังอยู่สถานะ pending.
    Idempotent: กด Pay ซ้ำ → คืน transaction_ref เดิม (reuse pending payment).
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
                    SELECT id, customer_id, status, total_amount, expired_at
                    FROM booking WHERE id = %s FOR UPDATE
                    """,
                    (body.booking_id,),
                )
                booking = cur.fetchone()
                if not booking:
                    raise HTTPException(status_code=404, detail="ไม่พบ booking")

                b_id, b_customer, b_status, b_amount, b_expired_at = booking

                if b_customer != customer_profile_id:
                    raise HTTPException(status_code=403, detail="ไม่ใช่ booking ของคุณ")
                if b_status != "pending":
                    raise HTTPException(
                        status_code=400,
                        detail=f"สถานะ booking '{b_status}' ไม่สามารถสร้าง QR ได้",
                    )

                # เช็กหมดเวลาจากฝั่ง DB clock
                cur.execute("SELECT NOW() > %s", (b_expired_at,))
                if cur.fetchone()[0]:
                    raise HTTPException(status_code=400, detail="booking หมดเวลา กรุณาจองใหม่")

                # reuse ถ้ามี pending payment อยู่แล้ว
                cur.execute(
                    """
                    SELECT id, transaction_ref, amount
                    FROM payment
                    WHERE booking_id = %s AND status = 'pending'
                    ORDER BY created_at DESC LIMIT 1
                    """,
                    (b_id,),
                )
                existing = cur.fetchone()

                if existing:
                    payment_id, transaction_ref, amount = existing
                    logger.info(
                        "generate-qr reuse pending payment_id=%s tx=%s booking=%s",
                        payment_id, transaction_ref, b_id,
                    )
                else:
                    transaction_ref = f"TX-{b_id}-{int(time.time())}-{secrets.token_hex(4)}"
                    amount = b_amount
                    cur.execute(
                        """
                        INSERT INTO payment
                          (booking_id, amount, transaction_ref, method, status, expired_at)
                        VALUES (%s, %s, %s, 'qr_code', 'pending', %s)
                        RETURNING id
                        """,
                        (b_id, amount, transaction_ref, b_expired_at),
                    )
                    payment_id = cur.fetchone()[0]
                    logger.info(
                        "generate-qr created payment_id=%s tx=%s booking=%s amount=%s",
                        payment_id, transaction_ref, b_id, amount,
                    )

                qr_payload = build_promptpay_payload(Config.PROMPTPAY_ID, Decimal(amount))

            conn.commit()

        except HTTPException:
            conn.rollback()
            raise
        except Exception as exc:
            conn.rollback()
            logger.exception("generate-qr error: %s", exc)
            raise HTTPException(status_code=500, detail=f"สร้าง QR ไม่สำเร็จ: {exc}")

    return {
        "payment_id": payment_id,
        "transaction_ref": transaction_ref,
        "amount": f"{Decimal(amount):.2f}",
        "qr_payload": qr_payload,
        "expired_at": _iso_utc(b_expired_at),
    }


# ---------------------------------------------------------------------------
# GET /status/{transaction_ref}  — Frontend polling
# ---------------------------------------------------------------------------

@payment_router.get("/status/{transaction_ref}")
def payment_status(transaction_ref: str, current_user: CurrentUser):
    """
    คืนสถานะ payment + booking ให้ frontend poll (ทุก 3-5 วินาที).
    Terminal states: payment_status in (paid, failed, expired) หรือ booking_status ใน terminal.
    """
    if current_user["role"] != "customer":
        raise HTTPException(status_code=403, detail="เฉพาะลูกค้าเท่านั้น")

    customer_profile_id = current_user.get("customer_profile_id")
    if not customer_profile_id:
        raise HTTPException(status_code=400, detail="ไม่พบ customer profile")

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                  p.id, p.transaction_ref, p.amount, p.status, p.paid_at,
                  b.id, b.customer_id, b.status, b.expired_at,
                  GREATEST(0, EXTRACT(EPOCH FROM (b.expired_at - NOW()))::INT)
                FROM payment p
                JOIN booking b ON b.id = p.booking_id
                WHERE p.transaction_ref = %s
                """,
                (transaction_ref,),
            )
            row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="ไม่พบ transaction_ref นี้")

    (
        payment_id, tx_ref, amount, payment_status_v, paid_at,
        booking_id, b_customer_id, booking_status_v, booking_expired_at,
        seconds_remaining,
    ) = row

    if b_customer_id != customer_profile_id:
        raise HTTPException(status_code=403, detail="ไม่ใช่ booking ของคุณ")

    return {
        "transaction_ref": tx_ref,
        "payment_id": payment_id,
        "booking_id": booking_id,
        "payment_status": payment_status_v,
        "booking_status": booking_status_v,
        "amount": f"{Decimal(amount):.2f}",
        "paid_at": _iso_utc(paid_at),
        "expired_at": _iso_utc(booking_expired_at),
        "seconds_remaining": int(seconds_remaining) if seconds_remaining is not None else 0,
    }


# ---------------------------------------------------------------------------
# POST /webhook  — Gateway-facing: finalize payment
# ---------------------------------------------------------------------------

class WebhookBody(BaseModel):
    booking_id: int
    transaction_ref: str = Field(..., min_length=1, max_length=100)
    amount: Decimal
    method: Literal["qr_code", "credit_card", "bank_transfer"]
    status: Literal["paid", "failed"]
    event_id: Optional[str] = None


def _verify_signature(raw_body: bytes, signature: Optional[str]) -> bool:
    if not signature:
        return False
    secret = Config.PAYMENT_WEBHOOK_SECRET.encode("utf-8")
    expected = hmac.HMAC(secret, raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


@payment_router.post("/webhook")
async def payment_webhook(request: Request):
    """
    รับผลจาก Payment Gateway แล้ว finalize payment + booking.
    Flow ใหม่: /generate-qr สร้าง payment(pending) มาก่อน → webhook UPDATE เป็น paid/failed.
    Idempotency: UPDATE ... WHERE status='pending' ได้แค่ครั้งเดียว; replay → short-circuit.
    """
    raw_body = await request.body()
    signature = request.headers.get("x-signature") or request.headers.get("X-Signature")

    if not _verify_signature(raw_body, signature):
        logger.warning("Webhook signature invalid")
        raise HTTPException(status_code=401, detail="invalid signature")

    try:
        payload = json.loads(raw_body.decode("utf-8"))
        body = WebhookBody(**payload)
    except (json.JSONDecodeError, ValidationError) as exc:
        raise HTTPException(status_code=400, detail=f"invalid payload: {exc}")

    with get_db_connection() as conn:
        try:
            with conn.cursor() as cur:
                # Lock booking
                cur.execute(
                    """
                    SELECT id, concert_id, customer_id, status, total_amount
                    FROM booking WHERE id = %s FOR UPDATE
                    """,
                    (body.booking_id,),
                )
                booking = cur.fetchone()
                if not booking:
                    conn.rollback()
                    raise HTTPException(status_code=404, detail="ไม่พบ booking")

                b_id, concert_id, customer_id, b_status, total_amount = booking

                # Short-circuit booking terminal state
                if b_status in ("paid", "cancelled", "expired"):
                    conn.rollback()
                    logger.info(
                        "Webhook replay: booking %s already '%s' (tx=%s)",
                        b_id, b_status, body.transaction_ref,
                    )
                    return {
                        "message": "already processed",
                        "booking_id": b_id,
                        "status": b_status,
                    }

                # Amount guard
                if Decimal(body.amount) != Decimal(total_amount):
                    conn.rollback()
                    raise HTTPException(
                        status_code=400,
                        detail=f"amount mismatch: expected {total_amount}, got {body.amount}",
                    )

                # UPDATE pending payment → finalize (atomic idempotency ผ่าน WHERE status='pending')
                payment_status = body.status  # 'paid' | 'failed'
                cur.execute(
                    """
                    UPDATE payment
                    SET status  = %s,
                        method  = %s,
                        paid_at = CASE WHEN %s = 'paid' THEN NOW() ELSE paid_at END
                    WHERE transaction_ref = %s AND status = 'pending'
                    RETURNING id
                    """,
                    (payment_status, body.method, payment_status, body.transaction_ref),
                )
                updated = cur.fetchone()

                if updated is None:
                    # ไม่มี pending row ตรง transaction_ref นี้
                    cur.execute(
                        "SELECT id, status FROM payment WHERE transaction_ref = %s",
                        (body.transaction_ref,),
                    )
                    existing = cur.fetchone()
                    conn.rollback()
                    if existing and existing[1] in ("paid", "failed", "expired"):
                        logger.info(
                            "Webhook replay: payment %s already '%s' (tx=%s)",
                            existing[0], existing[1], body.transaction_ref,
                        )
                        return {
                            "message": "already processed",
                            "booking_id": b_id,
                            "status": b_status,
                            "payment_id": existing[0],
                        }
                    # ไม่มี payment เลย — บังคับผ่าน /generate-qr ก่อน
                    raise HTTPException(
                        status_code=400,
                        detail="unknown transaction_ref — ต้องเรียก /generate-qr ก่อน",
                    )

                payment_id = updated[0]

                # Side effects
                if payment_status == "paid":
                    cur.execute(
                        "UPDATE booking SET status = 'paid' WHERE id = %s",
                        (b_id,),
                    )
                    cur.execute(
                        """
                        UPDATE seat SET status = 'sold'
                        WHERE id IN (SELECT seat_id FROM ticket WHERE booking_id = %s)
                        """,
                        (b_id,),
                    )
                    cur.execute(
                        """
                        UPDATE queue_session SET status = 'completed'
                        WHERE customer_id = %s AND concert_id = %s AND status = 'admitted'
                        """,
                        (customer_id, concert_id),
                    )
                    cur.execute(
                        """
                        INSERT INTO finance
                          (concert_id, booking_id, type, amount, description)
                        VALUES (%s, %s, 'income', %s, 'payment webhook')
                        """,
                        (concert_id, b_id, body.amount),
                    )
                    new_booking_status = "paid"
                else:
                    cur.execute(
                        "UPDATE booking SET status = 'cancelled' WHERE id = %s",
                        (b_id,),
                    )
                    cur.execute(
                        """
                        UPDATE seat SET status = 'available'
                        WHERE id IN (SELECT seat_id FROM ticket WHERE booking_id = %s)
                        """,
                        (b_id,),
                    )
                    new_booking_status = "cancelled"

            conn.commit()
            logger.info(
                "Webhook processed: booking=%s payment=%s tx=%s -> %s",
                b_id, payment_id, body.transaction_ref, new_booking_status,
            )

        except HTTPException:
            conn.rollback()
            raise
        except Exception as exc:
            conn.rollback()
            logger.exception("Webhook error: %s", exc)
            raise HTTPException(status_code=500, detail=f"webhook error: {exc}")

    return {
        "message": "ok",
        "booking_id": b_id,
        "status": new_booking_status,
        "payment_id": payment_id,
    }
