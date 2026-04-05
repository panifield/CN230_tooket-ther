import uuid
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from redis import Redis
from sqlalchemy import select
from sqlalchemy.orm import Session

from tooket_ther.app.api.deps import get_db, get_current_user, get_redis
from tooket_ther.app.config import settings
from tooket_ther.app.integrations.payment import StubPaymentGateway
from tooket_ther.app.models.booking import Booking, Payment
from tooket_ther.app.models.user import User
from tooket_ther.app.schemas.payment import PaymentResponse, WebhookResponse
from tooket_ther.app.services.payment_service import PaymentService, _stub_qr_url

router = APIRouter()

def get_payment_service(db: Session = Depends(get_db), redis_client: Redis = Depends(get_redis)) -> PaymentService:
    gateway = StubPaymentGateway(secret_key="my_super_secret")
    return PaymentService(db=db, gateway=gateway, redis_client=redis_client)


@router.post("/bookings/{booking_id}", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    booking_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service),
) -> Any:
    """
    Create a payment for a specific booking and obtain a QR code url.
    """
    try:
        payment_response = await payment_service.create_payment_for_booking(booking_id=booking_id)
        return payment_response
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/bookings/{booking_id}", response_model=PaymentResponse)
def get_payment_by_booking(
    booking_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaymentResponse:
    booking = db.get(Booking, booking_id)
    if booking is None or booking.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Booking not found")
    pay = db.scalar(
        select(Payment)
        .where(Payment.booking_id == booking_id)
        .order_by(Payment.created_at.desc())
        .limit(1)
    )
    if pay is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Payment not found")
    return PaymentResponse(
        id=pay.id,
        booking_id=pay.booking_id,
        amount=float(pay.amount),
        method=pay.method,
        status=pay.status,
        external_ref=pay.external_ref,
        created_at=pay.created_at,
        qr_code_url=_stub_qr_url(pay.external_ref),
    )


@router.post("/{payment_id}/stub-complete", response_model=WebhookResponse)
def payment_stub_complete(
    payment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service),
) -> WebhookResponse:
    """Dev-only: simulate gateway success for local UX testing."""
    if not settings.debug:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Not found")
    pay = db.get(Payment, payment_id)
    if pay is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Payment not found")
    booking = db.get(Booking, pay.booking_id)
    if booking is None or booking.user_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Forbidden")
    payload_dict = {
        "transaction_id": pay.external_ref or str(pay.id),
        "reference_id": str(pay.id),
        "amount": float(pay.amount),
        "status": "success",
        "signature": "stub",
        "event_type": "payment.success",
    }
    payment_service.process_webhook(payload_dict=payload_dict, signature="stub")
    return WebhookResponse(success=True, message="Payment marked succeeded (stub)")


@router.post("/webhook", response_model=WebhookResponse)
def payment_webhook(
    request: Request,
    payload_dict: dict, # Added explicitly due to async request.json() handling internally
    x_signature: str = Header(None, description="Signature from Payment Gateway"),
    payment_service: PaymentService = Depends(get_payment_service),
) -> Any:
    """
    Webhook listener for external payment gateway.
    """
    if not x_signature:
        x_signature = "dummy_signature"
        
    try:
        payment_service.process_webhook(payload_dict=payload_dict, signature=x_signature)
        return WebhookResponse(success=True, message="Webhook processed successfully")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
