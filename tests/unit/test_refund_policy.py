"""T6.1 Unit tests for refund_policy domain logic."""
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock


from tooket_ther.app.domain.refund_policy import can_request_refund


NOW = datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc)


def make_booking(status: str = "paid") -> MagicMock:
    b = MagicMock()
    b.status = status
    return b


def make_concert(days_from_now: int) -> MagicMock:
    c = MagicMock()
    c.starts_at = NOW + timedelta(days=days_from_now)
    return c


@pytest.mark.parametrize("days,expected", [
    (8, True),   # 8 days away — ok
    (7, True),   # exactly 7 days — boundary ok
    (6, False),  # 6 days — too close
    (0, False),  # same day — too close
    (-1, False), # in the past
])
def test_refund_policy_time_boundary(days: int, expected: bool):
    booking = make_booking("paid")
    concert = make_concert(days)
    result = can_request_refund(booking, concert, NOW)
    assert result == expected


@pytest.mark.parametrize("status", ["pending_payment", "cancelled", "refunded", "expired"])
def test_refund_policy_rejected_statuses(status: str):
    booking = make_booking(status)
    concert = make_concert(10)
    result = can_request_refund(booking, concert, NOW)
    assert result == False


def test_refund_policy_paid_far_ahead():
    booking = make_booking("paid")
    concert = make_concert(30)
    assert can_request_refund(booking, concert, NOW) == True
