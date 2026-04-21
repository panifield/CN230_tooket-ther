"""
app.py — Tooket-ther FastAPI Entry Point
-----------------------------------------
- lifespan: init DB pool + Background expiry task (Phase 5)
- Routers: auth, booking
- CORS: เปิดสำหรับ A4 frontend
"""
import asyncio
import logging
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import Config
from models import close_db_pool, get_db_connection, init_db_pool
from routes.auth import auth_router
from routes.booking import booking_router
from routes.organizer import organizer_router

logger = logging.getLogger("tooket-ther")

# ---------------------------------------------------------------------------
# Phase 5 — Expiry / Rollback background task
# ---------------------------------------------------------------------------

async def _expire_bookings_loop():
    """
    รันทุก 60 วินาที:
    - ค้นหา booking ที่ status='pending' และ expired_at < NOW()
    - คืน seat → 'available'
    - เปลี่ยน booking → 'expired'
    """
    while True:
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    # ดึง booking ที่หมดเวลา
                    cur.execute(
                        """
                        SELECT id FROM booking
                        WHERE status = 'pending' AND expired_at < NOW()
                        """
                    )
                    expired_ids = [row[0] for row in cur.fetchall()]

                    if expired_ids:
                        placeholders = ",".join(["%s"] * len(expired_ids))

                        # คืน seat → available
                        cur.execute(
                            f"""
                            UPDATE seat SET status = 'available'
                            WHERE id IN (
                                SELECT seat_id FROM ticket
                                WHERE booking_id IN ({placeholders})
                            )
                            """,
                            expired_ids,
                        )

                        # booking → expired
                        cur.execute(
                            f"UPDATE booking SET status = 'expired' WHERE id IN ({placeholders})",
                            expired_ids,
                        )

                        # queue_session → expired (ถ้ายัง admitted อยู่)
                        cur.execute(
                            f"""
                            UPDATE queue_session SET status = 'expired'
                            WHERE customer_id IN (
                                SELECT customer_id FROM booking
                                WHERE id IN ({placeholders})
                            )
                            AND status = 'admitted'
                            """,
                            expired_ids,
                        )

                    conn.commit()

                if expired_ids:
                    logger.info("Expiry task: cancelled %d booking(s): %s", len(expired_ids), expired_ids)

        except Exception as exc:
            logger.error("Expiry task error: %s", exc)

        await asyncio.sleep(60)


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db_pool()
    task = asyncio.create_task(_expire_bookings_loop())
    logger.info("Tooket-ther API started — expiry task running")
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    close_db_pool()
    logger.info("Tooket-ther API shut down")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Tooket-ther API",
    description="Concert Ticket Booking Platform — CN230",
    version="0.2.0",
    lifespan=lifespan,
)

# CORS — อนุญาต A4 frontend (ปรับ origins ตามที่ A4 ใช้จริง)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:5500", "http://localhost:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(booking_router)
app.include_router(organizer_router)


@app.get("/")
def root():
    return {"message": "Tooket-ther FastAPI is running", "docs": "/docs"}


@app.get("/health")
def health_check():
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1;")
                cur.fetchone()
        db_status = "ok"
    except Exception:
        db_status = "error"

    return {"app": "ok", "database": db_status}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    uvicorn.run("app:app", host="0.0.0.0", port=Config.PORT, reload=Config.DEBUG)

