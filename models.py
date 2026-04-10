from contextlib import contextmanager
from urllib.parse import urlparse

from psycopg2 import pool

from config import Config

_connection_pool = None


def _build_db_params(database_url: str) -> dict:
    parsed = urlparse(database_url)
    if parsed.scheme != "postgresql":
        raise ValueError("DATABASE_URL must start with postgresql://")

    return {
        "dbname": parsed.path.lstrip("/"),
        "user": parsed.username,
        "password": parsed.password,
        "host": parsed.hostname,
        "port": parsed.port or 5432,
    }


def init_db_pool() -> None:
    global _connection_pool
    if _connection_pool is None:
        params = _build_db_params(Config.DATABASE_URL)
        _connection_pool = pool.SimpleConnectionPool(
            minconn=1,
            maxconn=10,
            **params,
        )


def close_db_pool() -> None:
    global _connection_pool
    if _connection_pool is not None:
        _connection_pool.closeall()
        _connection_pool = None


@contextmanager
def get_db_connection():
    if _connection_pool is None:
        init_db_pool()

    conn = _connection_pool.getconn()
    try:
        yield conn
    finally:
        _connection_pool.putconn(conn)
