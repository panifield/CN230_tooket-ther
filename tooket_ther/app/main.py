from contextlib import asynccontextmanager
from typing import Any

import redis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from tooket_ther import __version__
from tooket_ther.app.api.v1.router import api_router
from tooket_ther.app.config import settings


# T6.3 OpenAPI tag metadata with role descriptions
TAGS_METADATA: list[dict[str, Any]] = [
    {
        "name": "Auth",
        "description": "การยืนยันตัวตนผู้ใช้ผ่าน OAuth (LINE / Facebook) และการจัดการ Access Token",
    },
    {
        "name": "Queue",
        "description": "🙋 **Role: User** — เข้าคิวและดูสถานะคิวก่อนเข้าเลือกที่นั่ง",
    },
    {
        "name": "Bookings",
        "description": "🎫 **Role: User** — เลือกที่นั่งและจองตั๋ว (สร้าง Booking + Seat hold)",
    },
    {
        "name": "Payments",
        "description": "💳 **Role: User** — ชำระเงินด้วย QR และรับ Webhook จาก Payment Gateway",
    },
    {
        "name": "Refunds",
        "description": "🔄 **Role: User** — ยื่นคำขอคืนเงินตามเงื่อนไขโดเมน (>7 วันก่อนคอนเสิร์ต)",
    },
    {
        "name": "Organizer",
        "description": "🏢 **Role: Organizer** — อนุมัติคืนเงิน, ปิดโซน, ย้ายที่นั่งลูกค้า (Free Upgrade)",
    },
    {
        "name": "Checker",
        "description": "✅ **Role: Checker (Staff)** — สแกน QR ตรวจบัตรหน้าประตูงาน (one-time check-in)",
    },
    {
        "name": "Reports",
        "description": "📊 **Role: Organizer** — Dashboard รายรับ/รายจ่าย + สถิติการขายต่อโซน",
    },
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = redis.Redis.from_url(settings.redis_url, decode_responses=True)
    try:
        yield
    finally:
        app.state.redis.close()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=__version__,
        debug=settings.debug,
        lifespan=lifespan,
        openapi_tags=TAGS_METADATA,
        # T6.3 Security scheme: Bearer JWT
        swagger_ui_init_oauth={
            "usePkceWithAuthorizationCodeGrant": True,
        },
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", tags=["System"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(api_router, prefix="/api/v1")

    # T6.3 Inject BearerAuth security scheme into the OpenAPI schema
    def custom_openapi():
        if app.openapi_schema:
            return app.openapi_schema
        schema = get_openapi(
            title=app.title,
            version=app.version,
            description="**Tooket-ther** — ระบบขายตั๋วคอนเสิร์ต (CN230)\n\nใช้ Bearer JWT Token ใน header: `Authorization: Bearer <token>`",
            tags=TAGS_METADATA,
            routes=app.routes,
        )
        schema.setdefault("components", {}).setdefault("securitySchemes", {})
        schema["components"]["securitySchemes"]["BearerAuth"] = {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "ใส่ JWT Access Token ที่ได้จาก `/api/v1/auth/oauth/.../callback`",
        }
        schema["security"] = [{"BearerAuth": []}]
        app.openapi_schema = schema
        return app.openapi_schema

    app.openapi = custom_openapi  # type: ignore[method-assign]

    return app


app = create_app()
