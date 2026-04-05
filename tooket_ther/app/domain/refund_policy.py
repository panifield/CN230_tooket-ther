from datetime import datetime, timedelta, timezone

def can_request_refund(booking, concert, now: datetime) -> bool:
    """
    T4.1 Domain rule: Validates if a user can request a refund.
    - Concert must be >= 7 days away
    - Ticket status must be 'paid'
    """
    # Ensure booking is indeed paid. If pending or already cancelled/refunded, reject.
    if booking.status != "paid":
        return False
    
    # Needs to be at least 7 days before concert starts
    time_until_concert = concert.starts_at - now
    if time_until_concert < timedelta(days=7):
        return False
        
    return True
