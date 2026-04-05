"""T6.2 Integration test: concurrent seat booking must not double-book."""
import threading
import uuid
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from tooket_ther.app.config import settings
from tooket_ther.app.services.booking_service import BookingService


@pytest.fixture(scope="module")
def db_session():
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    yield db
    db.close()


def test_concurrent_booking_no_double_book(db_session):
    """
    T6.2: Two users try to book the exact same seat_id concurrently.
    Only one should succeed; the other must get an error.
    """
    # Find a seat that is available
    row = db_session.execute(
        text("SELECT id FROM seats WHERE status = 'available' LIMIT 1")
    ).fetchone()

    if row is None:
        pytest.skip("No available seat in DB — seed data first.")

    seat_id = row[0]

    results = {"success": 0, "failure": 0}
    lock = threading.Lock()

    def do_book():
        # Each thread gets its own independent DB session
        engine = db_session.bind
        SessionLocal = sessionmaker(bind=engine)
        session = SessionLocal()
        try:
            service = BookingService(db=session)
            user_id = uuid.uuid4()  # Different synthetic user IDs
            service.reserve_seat(seat_id=seat_id, user_id=user_id)
            with lock:
                results["success"] += 1
        except Exception:
            with lock:
                results["failure"] += 1
        finally:
            session.close()

    threads = [threading.Thread(target=do_book) for _ in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert results["success"] == 1, f"Expected exactly 1 success, got: {results}"
    assert results["failure"] == 1, f"Expected exactly 1 failure, got: {results}"
