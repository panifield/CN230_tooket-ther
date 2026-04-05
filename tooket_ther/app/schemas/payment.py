from pydantic import BaseModel
import uuid
from datetime import datetime
from typing import Optional

class PaymentResponse(BaseModel):
    id: uuid.UUID
    booking_id: uuid.UUID
    amount: float
    method: str
    status: str
    external_ref: Optional[str] = None
    created_at: datetime
    
    qr_code_url: Optional[str] = None # Added for convenience to client

    class Config:
        from_attributes = True

class WebhookResponse(BaseModel):
    success: bool
    message: str
