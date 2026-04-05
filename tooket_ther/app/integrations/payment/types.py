from typing import Optional
from pydantic import BaseModel, Field


class PaymentCreateRequest(BaseModel):
    reference_id: str
    amount: float
    description: str


class PaymentCreateResponse(BaseModel):
    transaction_id: str
    qr_code_url: str
    reference_id: str
    status: str


class PaymentGatewayPayload(BaseModel):
    """
    Webhook payload coming from the payment gateway.
    """
    transaction_id: str
    reference_id: str
    amount: float
    status: str
    signature: str = Field(..., description="HMAC or similar signature to verify the webhook")
    event_type: str = "payment.success"
