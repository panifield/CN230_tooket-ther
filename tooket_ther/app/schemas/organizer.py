from pydantic import BaseModel
import uuid
from typing import Optional

class ZoneCloseRequest(BaseModel):
    reason: Optional[str] = "Low sales"
    
class BookingMoveRequest(BaseModel):
    target_zone_id: uuid.UUID
