from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from tooket_ther.app.config import settings

# Registers all models on Base.metadata
from tooket_ther.app.models import Base  # noqa: F401

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
