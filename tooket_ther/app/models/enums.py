from enum import StrEnum


class OAuthProvider(StrEnum):
    LINE = "line"
    FACEBOOK = "facebook"


class ConcertStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"
    CANCELLED = "cancelled"


class ZoneStatus(StrEnum):
    OPEN = "open"
    CLOSED = "closed"


class SeatStatus(StrEnum):
    AVAILABLE = "available"
    LOCKED = "locked"
    SOLD = "sold"


class BookingStatus(StrEnum):
    PENDING_PAYMENT = "pending_payment"
    PAID = "paid"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    MOVED = "moved"


class DeliveryMethod(StrEnum):
    POSTAL = "postal"
    PICKUP_AT_VENUE = "pickup_at_venue"


class PaymentMethod(StrEnum):
    QR = "qr"


class PaymentStatus(StrEnum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


class RefundRequestStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"


class QueueEntryStatus(StrEnum):
    WAITING = "waiting"
    ADMITTED = "admitted"
    EXPIRED = "expired"


class LedgerEntryType(StrEnum):
    REVENUE = "revenue"
    EXPENSE = "expense"
