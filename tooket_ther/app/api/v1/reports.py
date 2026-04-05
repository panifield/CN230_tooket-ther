import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any

from tooket_ther.app.api.deps import get_db, get_current_user
from tooket_ther.app.models.user import User
from tooket_ther.app.schemas.reports import FinancialSummaryResponse, ZoneStatsResponse
from tooket_ther.app.services.report_service import ReportService

router = APIRouter()

def get_report_service(db: Session = Depends(get_db)) -> ReportService:
    return ReportService(db=db)

@router.get("/concerts/{concert_id}/financials", response_model=FinancialSummaryResponse)
def get_financials(
    concert_id: uuid.UUID,
    current_user: User = Depends(get_current_user), # Usually restricted to concert owner/admin
    report_service: ReportService = Depends(get_report_service)
) -> Any:
    """T5.3 Get financial reporting aggregations"""
    try:
        return report_service.get_concert_financial_summary(concert_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/concerts/{concert_id}/zones", response_model=ZoneStatsResponse)
def get_zone_stats(
    concert_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    report_service: ReportService = Depends(get_report_service)
) -> Any:
    """T5.4 Get zone occupancy reporting"""
    try:
        return report_service.get_zone_booking_stats(concert_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
