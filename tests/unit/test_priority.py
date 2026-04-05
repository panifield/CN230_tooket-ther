"""T6.1 Unit tests for PriorityStrategy domain logic."""
import pytest
from unittest.mock import MagicMock

from tooket_ther.app.domain.priority import PriorityStrategy


def make_user(province: str | None = None) -> MagicMock:
    u = MagicMock()
    u.province = province
    u.priority_tier = 0
    return u


def make_concert(host_country_code: str = "TH") -> MagicMock:
    c = MagicMock()
    c.host_country_code = host_country_code
    return c


class TestPriorityStrategyTH:
    def test_thai_concert_with_province_gets_high_score(self):
        user = make_user(province="Bangkok")
        concert = make_concert("TH")
        score = PriorityStrategy.compute_priority_score(user, concert)
        assert score == PriorityStrategy.LOCAL_SCORE

    def test_thai_concert_without_province_gets_zero(self):
        user = make_user(province=None)
        concert = make_concert("TH")
        score = PriorityStrategy.compute_priority_score(user, concert)
        assert score == PriorityStrategy.DEFAULT_SCORE

    def test_thai_concert_with_blank_province_gets_zero(self):
        user = make_user(province="  ")
        concert = make_concert("TH")
        score = PriorityStrategy.compute_priority_score(user, concert)
        assert score == PriorityStrategy.DEFAULT_SCORE


class TestPriorityStrategyInternational:
    def test_international_concert_with_province_gets_neutral(self):
        user = make_user(province="Tokyo")
        concert = make_concert("JP")
        score = PriorityStrategy.compute_priority_score(user, concert)
        assert score == PriorityStrategy.NEUTRAL_SCORE

    def test_international_concert_without_province_gets_zero(self):
        user = make_user(province=None)
        concert = make_concert("JP")
        score = PriorityStrategy.compute_priority_score(user, concert)
        assert score == PriorityStrategy.DEFAULT_SCORE


class TestSyncUserPriorityTier:
    def test_sync_sets_priority_tier_on_user(self):
        user = make_user(province="Chiang Mai")
        concert = make_concert("TH")
        PriorityStrategy.sync_user_priority_tier(user, concert)
        assert user.priority_tier == PriorityStrategy.LOCAL_SCORE
