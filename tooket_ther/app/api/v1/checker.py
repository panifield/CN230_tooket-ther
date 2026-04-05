import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any

from tooket_ther.app.api.deps import get_db, get_current_user
from tooket_ther.app.models.user import User
from tooket_ther.app.schemas.checker import TicketCheckinRequest, TicketCheckinResponse
from tooket_ther.app.services.checkin_service import CheckinService

router = APIRouter()

def get_checkin_service(db: Session = Depends(get_db)) -> CheckinService:
    return CheckinService(db=db)

@router.post("/checkin", response_model=TicketCheckinResponse, status_code=status.HTTP_200_OK)
def checkin_ticket(
    req: TicketCheckinRequest,
    current_user: User = Depends(get_current_user), # Requires user to be an admin/staff normally
    checkin_service: CheckinService = Depends(get_checkin_service)
) -> Any:
    """T5.2 checkin payload entry point for gate verification"""
    try:
        res = checkin_service.verify_and_checkin(token=req.ticket_token)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
