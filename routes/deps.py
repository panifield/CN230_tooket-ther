"""
deps.py — FastAPI Dependencies
--------------------------------
get_current_user : ตรวจ JWT และคืนข้อมูล user ปัจจุบัน
ใช้เป็น Depends() กับ route ที่ต้อง login
"""
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from config import Config
from models import get_db_connection

_bearer = HTTPBearer()


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
) -> dict:
    """
    อ่าน JWT จาก Authorization header และ return user dict
    Raises 401 ถ้า token หมดอายุหรือ invalid
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            Config.JWT_SECRET_KEY,
            algorithms=[Config.JWT_ALGORITHM],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token หมดอายุแล้ว กรุณา login ใหม่",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token ไม่ถูกต้อง",
        )

    user_id: int | None = payload.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token ไม่มีข้อมูล user_id",
        )

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT u.id, u.name, u.email, u.role,
                       cp.id AS customer_profile_id,
                       cp.location_score,
                       op.id AS organizer_profile_id
                FROM users u
                LEFT JOIN customer_profile cp ON cp.user_id = u.id
                LEFT JOIN organizer_profile op ON op.user_id = u.id
                WHERE u.id = %s
                """,
                (user_id,),
            )
            row = cur.fetchone()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ไม่พบ user ในระบบ",
        )

    return {
        "user_id": row[0],
        "name": row[1],
        "email": row[2],
        "role": row[3],
        "customer_profile_id": row[4],
        "location_score": row[5],
        "organizer_profile_id": row[6],
    }


# Type alias สำหรับใช้กับ route
CurrentUser = Annotated[dict, Depends(get_current_user)]
