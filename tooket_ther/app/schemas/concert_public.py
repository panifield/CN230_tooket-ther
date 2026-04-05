"""Public concert discovery (no auth)."""

from datetime import datetime

from pydantic import BaseModel, Field


class ConcertListItem(BaseModel):
    id: str
    title: str
    venue: str
    starts_at: datetime
    sales_starts_at: datetime
    host_country_code: str
    poster_url: str | None = None
    min_price: str | None = Field(None, description="Lowest zone price if any")
    max_price: str | None = Field(None, description="Highest zone price if any")


class ZonePublic(BaseModel):
    id: str
    name: str
    price: str
    total_seats: int
    available_seats: int
    status: str


class ConcertDetailResponse(BaseModel):
    id: str
    title: str
    venue: str
    starts_at: datetime
    ends_at: datetime | None
    sales_starts_at: datetime
    host_country_code: str
    poster_url: str | None = None
    lineup: list[str] = Field(default_factory=list)
    zones: list[ZonePublic]


class SeatMapSeat(BaseModel):
    id: str
    row_label: str
    seat_no: str
    status: str
    locked_until: datetime | None = None


class SeatMapZone(BaseModel):
    id: str
    name: str
    price: str
    status: str
    seats: list[SeatMapSeat]


class ConcertSeatMapResponse(BaseModel):
    concert_id: str
    zones: list[SeatMapZone]
