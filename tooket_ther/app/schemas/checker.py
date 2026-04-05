from pydantic import BaseModel

class TicketCheckinRequest(BaseModel):
    ticket_token: str

class TicketCheckinResponse(BaseModel):
    success: bool
    message: str
    booking_id: str
    seat_label: str
