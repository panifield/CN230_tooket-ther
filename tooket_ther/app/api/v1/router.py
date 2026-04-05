from fastapi import APIRouter

from tooket_ther.app.api.v1 import auth, queue, bookings

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(queue.router, tags=["queue"])
api_router.include_router(bookings.router)
