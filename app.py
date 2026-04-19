import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI

from config import Config
from models import close_db_pool, get_db_connection, init_db_pool
from routes.auth import auth_router
from routes.booking import booking_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db_pool()
    yield
    close_db_pool()

app = FastAPI(title="Tooket-ther API", lifespan=lifespan)

app.include_router(auth_router)
app.include_router(booking_router)

@app.get("/")
def root():
    return {"message": "Tooket-ther FastAPI is running"}

@app.get("/health")
def health_check():
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1;")
                _ = cur.fetchone()
        db_status = "ok"
    except Exception:
        db_status = "error"

    return {"app": "ok", "database": db_status}

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=Config.PORT, reload=Config.DEBUG)
