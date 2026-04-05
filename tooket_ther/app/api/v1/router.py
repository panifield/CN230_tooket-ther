from fastapi import APIRouter

from tooket_ther.app.api.v1 import auth, queue, bookings, payments, organizer, refunds, checker, reports

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(queue.router, prefix="/queue", tags=["Queue"])
api_router.include_router(bookings.router, prefix="/bookings", tags=["Bookings"])
api_router.include_router(payments.router, prefix="/payments", tags=["Payments"])
api_router.include_router(organizer.router, prefix="/organizer", tags=["Organizer"])
api_router.include_router(refunds.router, prefix="/bookings", tags=["Refunds"])
api_router.include_router(checker.router, prefix="/checker", tags=["Checker"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
