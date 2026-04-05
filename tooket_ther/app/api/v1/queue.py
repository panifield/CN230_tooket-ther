import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from redis import Redis
from sqlalchemy.orm import Session

from tooket_ther.app.api.deps import get_current_user, get_db, get_redis
from tooket_ther.app.config import settings
from tooket_ther.app.models.user import User
from tooket_ther.app.schemas.queue import QueueAdmitResponse, QueueJoinResponse, QueueStatusResponse
from tooket_ther.app.services import queue_service

router = APIRouter(prefix="/concerts", tags=["queue"])


@router.post("/{concert_id}/queue/join", response_model=QueueJoinResponse)
def queue_join(
    concert_id: uuid.UUID,
    db: Session = Depends(get_db),
    redis_client: Redis = Depends(get_redis),
    user: User = Depends(get_current_user),
) -> QueueJoinResponse:
    try:
        entry = queue_service.join_queue(
            db, redis_client, concert_id=concert_id, user_id=user.id
        )
    except queue_service.QueueServiceError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    return QueueJoinResponse(
        queue_entry_id=str(entry.id),
        priority_score=entry.priority_score,
    )


@router.get("/{concert_id}/queue/status", response_model=QueueStatusResponse)
def queue_status(
    concert_id: uuid.UUID,
    db: Session = Depends(get_db),
    redis_client: Redis = Depends(get_redis),
    user: User = Depends(get_current_user),
) -> QueueStatusResponse:
    data = queue_service.queue_status(
        db, redis_client, concert_id=concert_id, user_id=user.id
    )
    return QueueStatusResponse(**data)


@router.post("/{concert_id}/queue/admit", response_model=QueueAdmitResponse)
def queue_admit(
    concert_id: uuid.UUID,
    db: Session = Depends(get_db),
    redis_client: Redis = Depends(get_redis),
    user: User = Depends(get_current_user),
) -> QueueAdmitResponse:
    try:
        admission = queue_service.admit_and_issue_token(
            db, redis_client, concert_id=concert_id, user_id=user.id
        )
    except queue_service.QueueServiceError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    return QueueAdmitResponse(
        admission_token=admission,
        expires_in_seconds=settings.jwt_admission_expire_minutes * 60,
    )
