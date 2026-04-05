from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class HoldRequest(BaseModel):
    concert_id: UUID
    seat_ids: list[UUID]


class BookingResponse(BaseModel):
    id: UUID
    concert_id: UUID
    seat_id: UUID
    status: str
    locked_until: Optional[datetime] = None
    created_at: datetime
    
    # history/updates fields
    holder_name: Optional[str] = None
    delivery_method: Optional[str] = None
    
    model_config = {"from_attributes": True}


class BookingUpdate(BaseModel):
    holder_name: Optional[str] = None
    delivery_method: Optional[str] = None


class HoldResponse(BaseModel):
    bookings: list[BookingResponse]
