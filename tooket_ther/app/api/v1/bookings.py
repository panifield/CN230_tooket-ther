import uuid

import jwt
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from tooket_ther.app.api.deps import get_current_user, get_db
from tooket_ther.app.core.jwt_tokens import TOKEN_TYPE_ADMISSION, decode_token
from tooket_ther.app.models.booking import Booking
from tooket_ther.app.models.user import User
from tooket_ther.app.schemas.booking import (
    BookingResponse,
    BookingUpdate,
    HoldRequest,
    HoldResponse,
)
from tooket_ther.app.services import booking_service

router = APIRouter(prefix="/bookings", tags=["bookings"])


def verify_admission(
    concert_id: uuid.UUID,
    x_admission_token: str = Header(...),
) -> dict:
    try:
        payload = decode_token(x_admission_token)
    except jwt.PyJWTError as e:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, detail="Invalid admission token"
        ) from e

    if payload.get("type") != TOKEN_TYPE_ADMISSION:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, detail="Invalid token type"
        )

    if payload.get("concert_id") != str(concert_id):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, detail="Admission token is for a different concert"
        )

    return payload


@router.post("/holds", response_model=HoldResponse)
def create_hold(
    request: HoldRequest,
    x_admission_token: str = Header(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> HoldResponse:
    verify_admission(request.concert_id, x_admission_token)

    try:
        bookings = booking_service.create_hold(
            db, user_id=user.id, concert_id=request.concert_id, seat_ids=request.seat_ids
        )
        db.commit()
    except ValueError as e:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail=str(e)) from e
    except Exception as e:
        db.rollback()
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)) from e

    return HoldResponse(bookings=bookings)  # type: ignore


@router.get("/my", response_model=list[BookingResponse])
def my_bookings(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Booking]:
    stmt = (
        select(Booking)
        .where(Booking.user_id == user.id)
        .order_by(Booking.created_at.desc())
    )
    bookings = db.scalars(stmt).all()
    return list(bookings)


@router.patch("/{booking_id}", response_model=BookingResponse)
def update_booking(
    booking_id: uuid.UUID,
    update_data: BookingUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Booking:
    booking = db.get(Booking, booking_id)
    if not booking or booking.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Booking not found")

    if update_data.holder_name is not None:
        booking.holder_name = update_data.holder_name
    if update_data.delivery_method is not None:
        booking.delivery_method = update_data.delivery_method

    db.commit()
    db.refresh(booking)
    return booking
