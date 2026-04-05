import abc
import uuid
import uuid
from decimal import Decimal

from .types import PaymentCreateRequest, PaymentCreateResponse, PaymentGatewayPayload


class PaymentGateway(abc.ABC):
    @abc.abstractmethod
    async def create_payment(self, request: PaymentCreateRequest) -> PaymentCreateResponse:
        """Create a new payment with the external gateway"""
        pass

    @abc.abstractmethod
    def verify_webhook_signature(self, payload: dict, signature: str) -> bool:
        """Verify the webhook payload signature"""
        pass


class StubPaymentGateway(PaymentGateway):
    """
    Stub implementation for local dev/testing.
    Generates a fake QR code URL and approves everything.
    """
    
    def __init__(self, secret_key: str = "dummy_secret"):
        self.secret_key = secret_key
    
    async def create_payment(self, request: PaymentCreateRequest) -> PaymentCreateResponse:
        transaction_id = f"txn_{uuid.uuid4().hex[:12]}"
        qr_code_url = f"https://sandbox.payment-gateway.com/qr/{transaction_id}"
        
        return PaymentCreateResponse(
            transaction_id=transaction_id,
            qr_code_url=qr_code_url,
            reference_id=request.reference_id,
            status="pending"
        )
        
    def verify_webhook_signature(self, payload: dict, signature: str) -> bool:
        # In this stub we just assume the signature = "valid_signature" 
        # or we could do a real HMAC calculation with `self.secret_key` if needed.
        return True
