"""Pass ("swipe left") records.

A dedicated collection rather than Like(status=DECLINED): the likes
collection's semantics drive mutual-match detection and overloading it
would risk corrupting those queries.

The TTL index doubles as the reappear cooldown — passed users
automatically re-enter the deck after 30 days with zero cron work.
"""
from datetime import datetime

import pymongo
from pymongo import IndexModel
from beanie import Document, Indexed
from pydantic import Field

PASS_COOLDOWN_SECONDS = 30 * 24 * 3600  # 30 days


class Pass(Document):
    passer_id: Indexed(str) = Field(..., alias="passerId")
    passed_user_id: str = Field(..., alias="passedUserId")
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")

    class Settings:
        name = "passes"
        indexes = [
            IndexModel(
                [("passerId", pymongo.ASCENDING), ("passedUserId", pymongo.ASCENDING)],
                unique=True,
            ),
            IndexModel(
                [("createdAt", pymongo.ASCENDING)],
                expireAfterSeconds=PASS_COOLDOWN_SECONDS,
            ),
        ]

    class Config:
        populate_by_name = True
