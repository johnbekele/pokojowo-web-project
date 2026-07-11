"""Fixed-window rate-limit counters backed by Mongo.

A per-process limiter (e.g. slowapi's default memory store) is useless
under gunicorn multi-worker deployments, so counters live in Mongo.
Entries expire via a TTL index one hour after their window starts.
"""
from datetime import datetime

import pymongo
from pymongo import IndexModel
from beanie import Document, Indexed
from pydantic import Field

RATE_LIMIT_WINDOW_SECONDS = 3600


class RateLimitEntry(Document):
    key: Indexed(str, unique=True)  # e.g. "otp:{user_id}", "otp:phone:{e164}"
    # "count" would shadow beanie.Document.count(); store as attempts
    attempts: int = 0
    window_start: datetime = Field(default_factory=datetime.utcnow, alias="windowStart")

    class Settings:
        name = "rate_limits"
        indexes = [
            # TTL: entries vanish an hour after the window opened
            IndexModel(
                [("windowStart", pymongo.ASCENDING)],
                expireAfterSeconds=RATE_LIMIT_WINDOW_SECONDS,
            ),
        ]

    class Config:
        populate_by_name = True
