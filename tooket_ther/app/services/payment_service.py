import uuid
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from redis import Redis

from tooket_ther.app.models.booking import Booking, Payment
from tooket_ther.app.models.concert import Seat
from tooket_ther.app.models.enums import BookingStatus, PaymentStatus, SeatStatus
from tooket_ther.app.integrations.payment import PaymentGateway, PaymentCreateRequest, PaymentGatewayPayload
from tooket_ther.app.schemas.payment import PaymentResponse

MAX_CONCURRENT_CHECKOUTS = 100

def _stub_qr_url(external_ref: str | None) -> str | None:
    if not external_ref:
        return None
    return f"https://sandbox.payment-gateway.com/qr/{external_ref}"


class PaymentService:
    def __init__(self, db: Session, gateway: PaymentGateway, redis_client: Redis):
        self.db = db
        self.gateway = gateway
        self.redis = redis_client

    async def create_payment_for_booking(self, booking_id: uuid.UUID) -> PaymentResponse:
        """
        T3.2 PaymentService.create_payment_for_booking
        T3.4 Checkout Slots logic via Redis
        Create a new payment record and fetch QR from gateway.
        Note: gateway.create_payment is async, but db operations are sync.
        """
        existing_pay = self.db.scalar(
            select(Payment)
            .where(
                Payment.booking_id == booking_id,
                Payment.status == PaymentStatus.PENDING.value,
            )
            .order_by(Payment.created_at.desc())
            .limit(1)
        )
        if existing_pay is not None:
            return PaymentResponse(
                id=existing_pay.id,
                booking_id=existing_pay.booking_id,
                amount=float(existing_pay.amount),
                method=existing_pay.method,
                status=existing_pay.status,
                external_ref=existing_pay.external_ref,
                created_at=existing_pay.created_at,
                qr_code_url=_stub_qr_url(existing_pay.external_ref),
            )

        with self.db.begin_nested():
            # Fetch booking to ensure it exists and is in pending state
            booking = self.db.execute(
                select(Booking)
                .where(Booking.id == booking_id)
                .options(joinedload(Booking.seat).joinedload(Seat.zone))
                .with_for_update()
            ).scalar_one_or_none()
            if not booking:
                raise ValueError("Booking not found")

            if booking.status != BookingStatus.PENDING_PAYMENT.value:
                raise ValueError(f"Booking status is {booking.status}, cannot create payment")

            # T3.4 Checkout slot logic via Redis
            # Increment a global slot counter for this concert
            slot_key = f"checkout_slots:{booking.concert_id}"
            
            current_slots = self.redis.incr(slot_key)
            if current_slots == 1:
                # Set expiry on first increment to prevent dangling counters
                self.redis.expire(slot_key, 900) # 15 minutes roughly the hold time

            try:
                if current_slots > MAX_CONCURRENT_CHECKOUTS:
                    # Slot queue full!
                    raise ValueError("Payment queue is full. Please try again in a few moments.")

                amount = float(booking.seat.zone.price)

                payment = Payment(
                    booking_id=booking.id,
                    amount=amount,
                    method="qr",
                    status=PaymentStatus.PENDING.value
                )
                self.db.add(payment)
                self.db.flush() # Ensure getting an ID

                # Call gateway
                req = PaymentCreateRequest(
                    reference_id=str(payment.id),
                    amount=float(payment.amount),
                    description=f"Ticket for booking {booking.id}"
                )
            except Exception:
                self.redis.decr(slot_key)
                raise

        self.db.commit()
        self.db.refresh(payment)

        try:
            gw_resp = await self.gateway.create_payment(req)
        except Exception:
            # Revert redis usage if gateway completely fails instantly
            self.redis.decr(slot_key)
            raise

        payment.external_ref = gw_resp.transaction_id
        self.db.commit()
        self.db.refresh(payment)

        return PaymentResponse(
            id=payment.id,
            booking_id=payment.booking_id,
            amount=float(payment.amount),
            method=payment.method,
            status=payment.status,
            external_ref=payment.external_ref,
            created_at=payment.created_at,
            qr_code_url=gw_resp.qr_code_url or _stub_qr_url(payment.external_ref),
        )

    def process_webhook(self, payload_dict: dict, signature: str) -> None:
        """
        T3.3 Webhook endpoint: verify signature
        """
        is_valid = self.gateway.verify_webhook_signature(payload_dict, signature)
        if not is_valid:
            raise ValueError("Invalid webhook signature")

        payload = PaymentGatewayPayload(**payload_dict)

        with self.db.begin_nested():
            payment = self.db.execute(
                select(Payment)
                .where(Payment.id == uuid.UUID(payload.reference_id))
                .with_for_update()
            ).scalar_one_or_none()
            
            if not payment:
                raise ValueError("Payment not found")

            if payment.status in [PaymentStatus.SUCCEEDED.value, PaymentStatus.FAILED.value]:
                return

            if payload.status.lower() == "success":
                payment.status = PaymentStatus.SUCCEEDED.value
                payment.raw_webhook = payload_dict
                
                booking = self.db.execute(
                    select(Booking).where(Booking.id == payment.booking_id).with_for_update()
                ).scalar_one()

                booking.status = BookingStatus.PAID.value

                seat = self.db.execute(
                    select(Seat).where(Seat.id == booking.seat_id).with_for_update()
                ).scalar_one()
                
                seat.status = SeatStatus.SOLD.value
                
                # Release checkout slot upon success!
                slot_key = f"checkout_slots:{booking.concert_id}"
                self.redis.decr(slot_key)

            elif payload.status.lower() == "failed":
                payment.status = PaymentStatus.FAILED.value
                payment.raw_webhook = payload_dict
                
                # We can also release checkout slots on failure
                booking = self.db.execute(
                    select(Booking).where(Booking.id == payment.booking_id)
                ).scalar_one()
                slot_key = f"checkout_slots:{booking.concert_id}"
                self.redis.decr(slot_key)

            self.db.flush()
        self.db.commit()
