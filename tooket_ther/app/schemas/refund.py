from pydantic import BaseModel
import uuid
from datetime import datetime
from typing import Optional

class RefundRequestCreate(BaseModel):
    bank_account_encrypted: str

class RefundRequestResponse(BaseModel):
    id: uuid.UUID
    booking_id: uuid.UUID
    status: str
    processed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
