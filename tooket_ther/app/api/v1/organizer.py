import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from tooket_ther.app.api.deps import get_db, get_current_user
from tooket_ther.app.models.user import User
from tooket_ther.app.services.organizer_service import OrganizerService
from tooket_ther.app.services.refund_service import RefundService
from tooket_ther.app.schemas.organizer import ZoneCloseRequest, BookingMoveRequest

router = APIRouter()

def get_organizer_service(db: Session = Depends(get_db)) -> OrganizerService:
    return OrganizerService(db=db)

def get_refund_service(db: Session = Depends(get_db)) -> RefundService:
    return RefundService(db=db)


@router.post("/refunds/{refund_id}/approve", status_code=status.HTTP_200_OK)
def approve_refund(
    refund_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    refund_service: RefundService = Depends(get_refund_service),
) -> Any:
    """T4.3 Approve refund -> return seat + update booking"""
    try:
        refund_service.approve_refund(refund_id=refund_id)
        return {"status": "success", "message": "Refund processed successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Error")


@router.post("/zones/{zone_id}/close", status_code=status.HTTP_200_OK)
def close_zone(
    zone_id: uuid.UUID,
    req: ZoneCloseRequest,
    current_user: User = Depends(get_current_user),
    organizer_service: OrganizerService = Depends(get_organizer_service),
) -> Any:
    """T4.4 OrganizerService.close_zone"""
    try:
        organizer_service.close_zone(zone_id=zone_id, reason=req.reason)
        return {"status": "success"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/bookings/{booking_id}/move", status_code=status.HTTP_200_OK)
def move_booking(
    booking_id: uuid.UUID,
    req: BookingMoveRequest,
    current_user: User = Depends(get_current_user),
    organizer_service: OrganizerService = Depends(get_organizer_service)
) -> Any:
    """T4.5 Flow move seat free upgrade"""
    try:
        organizer_service.move_booking_to_zone(booking_id=booking_id, target_zone_id=req.target_zone_id)
        return {"status": "success"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
