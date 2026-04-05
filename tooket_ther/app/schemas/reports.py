from pydantic import BaseModel
from typing import List

class FinancialSummaryResponse(BaseModel):
    concert_id: str
    total_revenues: float
    total_expenses: float
    net_profit: float

class ZoneStat(BaseModel):
    zone_id: str
    zone_name: str
    total_seats: int
    sold_seats: int
    occupancy_rate: float

class ZoneStatsResponse(BaseModel):
    concert_id: str
    zones: List[ZoneStat]
