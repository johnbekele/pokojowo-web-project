"""Fixed-window rate limiting on top of Mongo TTL counters."""
from datetime import datetime, timedelta

from fastapi import HTTPException, status

from app.models.rate_limit import RATE_LIMIT_WINDOW_SECONDS, RateLimitEntry


async def check_rate_limit(key: str, max_per_window: int) -> None:
    """Increment the counter for `key` and raise 429 once it exceeds
    max_per_window within the (TTL-bounded) window.

    Atomic via find_one_and_update with $inc + upsert, so it's safe
    across gunicorn workers.
    """
    collection = RateLimitEntry.get_motor_collection()
    now = datetime.utcnow()

    doc = await collection.find_one_and_update(
        {"key": key},
        {
            "$inc": {"attempts": 1},
            "$setOnInsert": {"windowStart": now},
        },
        upsert=True,
        return_document=True,
    )

    if doc["attempts"] > max_per_window:
        window_start = doc.get("windowStart", now)
        retry_at = window_start + timedelta(seconds=RATE_LIMIT_WINDOW_SECONDS)
        retry_after = max(1, int((retry_at - now).total_seconds()))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Please try again later.",
            headers={"Retry-After": str(retry_after)},
        )
