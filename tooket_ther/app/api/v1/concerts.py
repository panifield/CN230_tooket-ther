"""Public concert discovery (list + detail with zones)."""

from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from tooket_ther.app.api.deps import get_db
from tooket_ther.app.models.enums import ZoneStatus
from tooket_ther.app.repositories import concert_repo
from tooket_ther.app.schemas.concert_public import (
    ConcertDetailResponse,
    ConcertListItem,
    ConcertSeatMapResponse,
    SeatMapSeat,
    SeatMapZone,
    ZonePublic,
)

router = APIRouter(prefix="/concerts", tags=["Concerts"])


def _money(amount: object) -> str:
    return f"{float(amount):.2f}"


def _lineup_list(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [line.strip() for line in raw.splitlines() if line.strip()]


def _price_range_for_concert(concert) -> tuple[str | None, str | None]:
    open_zones = [z for z in concert.zones if z.status == ZoneStatus.OPEN.value]
    if not open_zones:
        return None, None
    prices = [float(z.price) for z in open_zones]
    return f"{min(prices):.2f}", f"{max(prices):.2f}"


@router.get("", response_model=list[ConcertListItem])
def list_concerts(
    db: Session = Depends(get_db),
    venue: str | None = Query(None, description="ค้นหาชื่อสถานที่ (contains)"),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
) -> list[ConcertListItem]:
    rows = concert_repo.list_published_concerts(
        db, venue_q=venue, date_from=date_from, date_to=date_to
    )
    out: list[ConcertListItem] = []
    for c in rows:
        lo, hi = _price_range_for_concert(c)
        out.append(
            ConcertListItem(
                id=str(c.id),
                title=c.title,
                venue=c.venue,
                starts_at=c.starts_at,
                sales_starts_at=c.sales_starts_at,
                host_country_code=c.host_country_code,
                poster_url=c.poster_url,
                min_price=lo,
                max_price=hi,
            )
        )
    return out


@router.get("/{concert_id}/seats", response_model=ConcertSeatMapResponse)
def get_concert_seat_map(
    concert_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> ConcertSeatMapResponse:
    concert = concert_repo.get_published_concert_with_zones_and_seats(db, concert_id)
    if concert is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Concert not found")

    zones_out: list[SeatMapZone] = []
    for z in sorted(concert.zones, key=lambda x: x.name):
        seats_sorted = sorted(z.seats, key=lambda s: (s.row_label, s.seat_no))
        zones_out.append(
            SeatMapZone(
                id=str(z.id),
                name=z.name,
                price=_money(z.price),
                status=z.status,
                seats=[
                    SeatMapSeat(
                        id=str(s.id),
                        row_label=s.row_label,
                        seat_no=s.seat_no,
                        status=s.status,
                        locked_until=s.locked_until,
                    )
                    for s in seats_sorted
                ],
            )
        )

    return ConcertSeatMapResponse(concert_id=str(concert.id), zones=zones_out)


@router.get("/{concert_id}", response_model=ConcertDetailResponse)
def get_concert_detail(
    concert_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> ConcertDetailResponse:
    concert = concert_repo.get_published_concert_with_zones(db, concert_id)
    if concert is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Concert not found")

    zones_out: list[ZonePublic] = []
    for z in sorted(concert.zones, key=lambda x: x.name):
        avail = concert_repo.count_available_seats_in_zone(db, z.id)
        zones_out.append(
            ZonePublic(
                id=str(z.id),
                name=z.name,
                price=_money(z.price),
                total_seats=z.total_seats,
                available_seats=avail,
                status=z.status,
            )
        )

    return ConcertDetailResponse(
        id=str(concert.id),
        title=concert.title,
        venue=concert.venue,
        starts_at=concert.starts_at,
        ends_at=concert.ends_at,
        sales_starts_at=concert.sales_starts_at,
        host_country_code=concert.host_country_code,
        poster_url=concert.poster_url,
        lineup=_lineup_list(concert.lineup),
        zones=zones_out,
    )
