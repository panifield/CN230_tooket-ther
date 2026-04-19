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
    LINE_REDIRECT_URI = os.getenv("LINE_REDIRECT_URI", "http://localhost:8000/auth/oauth/line/callback")

    # OAuth — Facebook
    FACEBOOK_CLIENT_ID = os.getenv("FACEBOOK_CLIENT_ID", "")
    FACEBOOK_CLIENT_SECRET = os.getenv("FACEBOOK_CLIENT_SECRET", "")
    FACEBOOK_REDIRECT_URI = os.getenv("FACEBOOK_REDIRECT_URI", "http://localhost:8000/auth/oauth/facebook/callback")
