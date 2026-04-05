from contextlib import asynccontextmanager

import redis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from tooket_ther import __version__
from tooket_ther.app.api.v1.router import api_router
from tooket_ther.app.config import settings


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
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", tags=["system"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(api_router, prefix="/api/v1")

    return app


app = create_app()
