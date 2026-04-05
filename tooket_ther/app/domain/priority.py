"""Priority tier / score from user address vs concert host (design_plan MVP)."""

from tooket_ther.app.models.concert import Concert
from tooket_ther.app.models.user import User


class PriorityStrategy:
    """
    MVP: ผู้ใช้กรอก province (ไม่ว่าง) และคอนเสิร์ตจัดที่ประเทศไทย (TH)
    → priority สูง (คิวก่อน) ตามเป้าหมาย local access
    """

    LOCAL_SCORE = 100
    DEFAULT_SCORE = 0
    NEUTRAL_SCORE = 50

    @classmethod
    def compute_priority_score(cls, user: User, concert: Concert) -> int:
        host = (concert.host_country_code or "TH").strip().upper()
        has_province = bool(user.province and user.province.strip())

        if host == "TH":
            return cls.LOCAL_SCORE if has_province else cls.DEFAULT_SCORE
        # คอนเสิร์ตนอกไทย: ยังไม่มี country บน user — ให้คะแนนกลางถ้ามี province กรอกไว้
        return cls.NEUTRAL_SCORE if has_province else cls.DEFAULT_SCORE

    @classmethod
    def sync_user_priority_tier(cls, user: User, concert: Concert) -> None:
        """Cache ลง users.priority_tier (smallint) ให้ query อื่นใช้ได้."""
        user.priority_tier = min(127, max(-128, cls.compute_priority_score(user, concert)))
