from fastapi import APIRouter

auth_router = APIRouter(prefix="/auth", tags=["auth"])

@auth_router.get("/health")
def auth_health():
    return {"service": "auth", "status": "ok"}
