import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from tooket_ther.app.api.deps import get_db, get_current_user
from tooket_ther.app.models.user import User
from tooket_ther.app.services.refund_service import RefundService
from tooket_ther.app.schemas.refund import RefundRequestCreate, RefundRequestResponse

router = APIRouter()

def get_refund_service(db: Session = Depends(get_db)) -> RefundService:
    return RefundService(db=db)

@router.post("/{booking_id}/refund", response_model=RefundRequestResponse, status_code=status.HTTP_201_CREATED)
def request_refund(
    booking_id: uuid.UUID,
    req: RefundRequestCreate,
    current_user: User = Depends(get_current_user),
    refund_service: RefundService = Depends(get_refund_service),
) -> Any:
    """
    T4.2 Create user refund_request
    """
    try:
        res = refund_service.request_refund(booking_id=booking_id, user_id=current_user.id, req=req)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
