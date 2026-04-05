import uuid
from typing import Any
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session
from redis import Redis

from tooket_ther.app.api.deps import get_db, get_current_user, get_redis
from tooket_ther.app.models.user import User
from tooket_ther.app.integrations.payment import StubPaymentGateway
from tooket_ther.app.services.payment_service import PaymentService
from tooket_ther.app.schemas.payment import PaymentResponse, WebhookResponse

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
