from fastapi import APIRouter

booking_router = APIRouter(prefix="/booking", tags=["booking"])

@booking_router.get("/health")
def booking_health():
    return {"service": "booking", "status": "ok"}
