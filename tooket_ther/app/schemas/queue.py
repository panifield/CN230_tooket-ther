from pydantic import BaseModel, Field


class QueueJoinResponse(BaseModel):
    queue_entry_id: str
    priority_score: int


class QueueStatusResponse(BaseModel):
    in_queue: bool
    status: str | None
    position: int | None = None
    total: int | None = None
    queue_entry_id: str | None = None
    note: str | None = None


class QueueAdmitResponse(BaseModel):
    admission_token: str
    token_type: str = "bearer"
    expires_in_seconds: int = Field(description="Admission JWT lifetime")
