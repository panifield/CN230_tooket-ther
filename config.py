import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/tookettherdb",
    )
    DEBUG = os.getenv("APP_DEBUG", os.getenv("FLASK_DEBUG", "false")).lower() == "true"
    PORT = int(os.getenv("PORT", "8000"))

    # JWT
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ALGORITHM = "HS256"
    JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

    # OAuth — Line
    LINE_CLIENT_ID = os.getenv("LINE_CLIENT_ID", "")
    LINE_CLIENT_SECRET = os.getenv("LINE_CLIENT_SECRET", "")
    LINE_REDIRECT_URI = os.getenv(
        "LINE_REDIRECT_URI", "http://127.0.0.1:5500/index.html"
    )

    # OAuth — Google
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI = os.getenv(
        "GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/oauth/google/callback"
    )

    # Payment webhook — HMAC-SHA256 shared secret กับ Payment Gateway
    PAYMENT_WEBHOOK_SECRET = os.getenv("PAYMENT_WEBHOOK_SECRET", "dev-webhook-secret")

    # PromptPay merchant ID (mobile number หรือ National ID) สำหรับ QR payload
    PROMPTPAY_ID = os.getenv("PROMPTPAY_ID", "0899999999")
