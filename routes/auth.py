"""
routes/auth.py — Authentication Endpoints
------------------------------------------
POST /auth/register          สร้าง user ใหม่ (dev/testing)
POST /auth/login             login ด้วย email + password
GET  /auth/oauth/{provider}/authorize-url  สร้าง OAuth URL
GET  /auth/oauth/{provider}/callback       รับ code → JWT
GET  /auth/me                ดูข้อมูล user ปัจจุบัน (ต้อง login)
"""
import hashlib
import hmac
import urllib.parse
from datetime import datetime, timedelta, timezone

import jwt
import requests as http
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, EmailStr

from config import Config
from models import get_db_connection
from routes.deps import CurrentUser

auth_router = APIRouter(prefix="/auth", tags=["auth"])

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _hash_password(password: str) -> str:
    """SHA-256 hash ของ password (dev) — production ควรใช้ bcrypt"""
    return hashlib.sha256(password.encode()).hexdigest()



def _fix_sequence(cur, table: str):
    """Reset sequence to the current max ID (hotfix for seed data out of sync)"""
    cur.execute(f"SELECT setval('{table}_id_seq', (SELECT COALESCE(MAX(id), 0) FROM {table}), true);")


def _issue_jwt(user_id: int, role: str) -> str:
    """ออก JWT access token"""
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=Config.JWT_EXPIRE_MINUTES),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm=Config.JWT_ALGORITHM)


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------

class RegisterBody(BaseModel):
    id_card: str
    name: str
    email: EmailStr
    phone: str
    address: str
    password: str
    role: str = "customer"  # customer | organizer | staff


class LoginBody(BaseModel):
    email: EmailStr
    password: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@auth_router.get("/health")
def auth_health():
    return {"service": "auth", "status": "ok"}


@auth_router.post("/register", status_code=status.HTTP_201_CREATED)
def register(body: RegisterBody):
    """
    สร้าง user ใหม่ (email auth)
    - สร้าง users row
    - ถ้า role=customer → สร้าง customer_profile ด้วย
    - สร้าง social_account (type_social='email')
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # เช็ก email ซ้ำ
            cur.execute("SELECT id FROM users WHERE email = %s", (body.email,))
            if cur.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Email นี้มีบัญชีอยู่แล้ว",
                )

            # Reset sequence if needed (hotfix for seed data out of sync)
            _fix_sequence(cur, "users")
            _fix_sequence(cur, "customer_profile")
            _fix_sequence(cur, "organizer_profile")
            _fix_sequence(cur, "staff_profile")
            _fix_sequence(cur, "social_account")

            # INSERT users
            cur.execute(
                """
                INSERT INTO users (id_card, name, email, role, phone, address, password)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    body.id_card,
                    body.name,
                    body.email,
                    body.role,
                    body.phone,
                    body.address,
                    _hash_password(body.password),
                ),
            )
            user_id = cur.fetchone()[0]

            # social_account (email)
            cur.execute(
                """
                INSERT INTO social_account (user_id, social_user_id, type_social)
                VALUES (%s, %s, 'email')
                """,
                (user_id, body.email),
            )

            # Create specific profiles based on role
            if body.role == "customer":
                cur.execute(
                    "INSERT INTO customer_profile (user_id, location_score) VALUES (%s, 0)",
                    (user_id,),
                )
            elif body.role == "organizer":
                cur.execute(
                    "INSERT INTO organizer_profile (user_id, company_name) VALUES (%s, %s)",
                    (user_id, f"{body.name}'s Company"),
                )
            elif body.role == "staff":
                # For staff, we might need an organizer_id. 
                # For now, let's pick the first organizer if one exists, or just a dummy if not.
                cur.execute("SELECT id FROM organizer_profile LIMIT 1")
                org_row = cur.fetchone()
                org_id = org_row[0] if org_row else None
                
                if org_id:
                    import secrets
                    cur.execute(
                        """
                        INSERT INTO staff_profile (organizer_id, user_id, staff_code, status)
                        VALUES (%s, %s, %s, 'active')
                        """,
                        (org_id, user_id, f"STF-{secrets.token_hex(4).upper()}"),
                    )

        conn.commit()

    return {"message": "สมัครสมาชิกสำเร็จ", "user_id": user_id}


@auth_router.post("/login")
def login(body: LoginBody):
    """
    Login ด้วย email + password → ออก JWT
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, role, password FROM users WHERE email = %s",
                (body.email,),
            )
            row = cur.fetchone()

    if row is None or row[2] != _hash_password(body.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email หรือ password ไม่ถูกต้อง",
        )

    user_id, role, _ = row
    token = _issue_jwt(user_id, role)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user_id,
        "role": role,
    }


# ---------------------------------------------------------------------------
# OAuth — Line / Facebook
# ---------------------------------------------------------------------------

_OAUTH_CONFIGS = {
    "line": {
        "authorize_url": "https://access.line.me/oauth2/v2.1/authorize",
        "token_url": "https://api.line.me/oauth2/v2.1/token",
        "profile_url": "https://api.line.me/v2/profile",
        "client_id": lambda: Config.LINE_CLIENT_ID,
        "client_secret": lambda: Config.LINE_CLIENT_SECRET,
        "redirect_uri": lambda: Config.LINE_REDIRECT_URI,
        "scope": "profile openid",
    },
    "google": {
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "profile_url": "https://www.googleapis.com/oauth2/v3/userinfo",
        "client_id": lambda: Config.GOOGLE_CLIENT_ID,
        "client_secret": lambda: Config.GOOGLE_CLIENT_SECRET,
        "redirect_uri": lambda: Config.GOOGLE_REDIRECT_URI,
        "scope": "openid email profile",
    },
}


def _get_oauth_config(provider: str) -> dict:
    cfg = _OAUTH_CONFIGS.get(provider)
    if cfg is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Provider '{provider}' ไม่รองรับ (รองรับ: line, google)",
        )
    return cfg


@auth_router.get("/oauth/{provider}/authorize-url")
def oauth_authorize_url(provider: str, state: str = Query(default="tooket-state")):
    """
    สร้าง URL สำหรับ redirect ไปหน้า Login ของ Line/Facebook
    """
    cfg = _get_oauth_config(provider)
    params = {
        "response_type": "code",
        "client_id": cfg["client_id"](),
        "redirect_uri": cfg["redirect_uri"](),
        "scope": cfg["scope"],
    "state": state,
        "access_type": "offline",
        "prompt": "select_account",
    }
    url = cfg["authorize_url"] + "?" + urllib.parse.urlencode(params)
    return {"provider": provider, "authorize_url": url}


@auth_router.get("/oauth/{provider}/callback")
def oauth_callback(provider: str, code: str = Query(...), state: str = Query(default="")):
    """
    รับ code จาก OAuth provider → แลก token → ดึง profile
    → ค้นหา/สร้าง user → ออก JWT
    """
    cfg = _get_oauth_config(provider)

    # 1. แลก code → access_token
    token_resp = http.post(
        cfg["token_url"],
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": cfg["redirect_uri"](),
            "client_id": cfg["client_id"](),
            "client_secret": cfg["client_secret"](),
        },
        timeout=10,
    )
    if not token_resp.ok:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="แลก token ไม่สำเร็จ")

    access_token = token_resp.json().get("access_token")

    # 2. ดึง profile
    profile_resp = http.get(
        cfg["profile_url"],
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    if not profile_resp.ok:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="ดึง profile ไม่สำเร็จ")

    profile = profile_resp.json()
    social_user_id = profile.get("sub") or profile.get("userId") or profile.get("id") or ""
    display_name = profile.get("name") or profile.get("displayName") or "User"
    email = profile.get("email", f"{social_user_id}@{provider}.oauth")

    # 3. ค้นหา / สร้าง user
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # ค้นหา social_account
            cur.execute(
                """
                SELECT u.id, u.role
                FROM social_account sa
                JOIN users u ON u.id = sa.user_id
                WHERE sa.social_user_id = %s AND sa.type_social = %s
                """,
                (social_user_id, provider),
            )
            existing = cur.fetchone()

            if existing:
                user_id, role = existing
            else:
                # Reset sequence if needed
                _fix_sequence(cur, "users")
                _fix_sequence(cur, "social_account")
                _fix_sequence(cur, "customer_profile")

                # สร้าง user ใหม่ (id_card และ phone ยังไม่มี ใส่ placeholder)
                cur.execute(
                    """
                    INSERT INTO users (id_card, name, email, role, phone, address, password)
                    VALUES (%s, %s, %s, 'customer', '', '', '')
                    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
                    RETURNING id, role
                    """,
                    (f"OAUTH-{social_user_id[:14]}", display_name, email),
                )
                user_id, role = cur.fetchone()

                # social_account
                cur.execute(
                    """
                    INSERT INTO social_account (user_id, social_user_id, type_social)
                    VALUES (%s, %s, %s)
                    ON CONFLICT DO NOTHING
                    """,
                    (user_id, social_user_id, provider),
                )

                # customer_profile
                cur.execute(
                    """
                    INSERT INTO customer_profile (user_id, location_score)
                    VALUES (%s, 0) ON CONFLICT (user_id) DO NOTHING
                    """,
                    (user_id,),
                )

        conn.commit()

    token = _issue_jwt(user_id, role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user_id,
        "display_name": display_name,
    }


@auth_router.get("/me")
def get_me(current_user: CurrentUser):
    """ดูข้อมูล user ที่ login อยู่"""
    return current_user
