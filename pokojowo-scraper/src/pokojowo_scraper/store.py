"""MongoDB access layer. Collections:

runs            — one document per pipeline run (dashboard run history)
pending         — extracted listings awaiting routing/review
seen_listings   — sourceUrl index for incremental scraping + price history
annotations     — dashboard issue tags / corrections (precision ground truth)
geocode_cache   — permanent Nominatim cache keyed by normalized address
poi_cache       — Overpass results keyed by geohash-6 cell
translations    — sha256(source_text) -> translated text
"""

from datetime import datetime, timezone
from typing import Any

import pymongo
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from pokojowo_scraper.config import settings

_client: AsyncIOMotorClient | None = None


def db() -> AsyncIOMotorDatabase:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongo_uri)
    return _client[settings.mongo_db]


async def ensure_indexes() -> None:
    d = db()
    await d.seen_listings.create_index("source_url", unique=True)
    await d.seen_listings.create_index("last_seen_run")
    await d.pending.create_index("source_url", unique=True)
    await d.pending.create_index([("status", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)])
    await d.pending.create_index("quality.confidence")
    await d.runs.create_index([("started_at", pymongo.DESCENDING)])
    await d.annotations.create_index([("listing_id", pymongo.ASCENDING)])
    await d.annotations.create_index([("field", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)])
    await d.geocode_cache.create_index("key", unique=True)
    await d.poi_cache.create_index("geohash", unique=True)
    await d.translations.create_index("text_hash", unique=True)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def is_seen(source_url: str) -> dict[str, Any] | None:
    return await db().seen_listings.find_one({"source_url": source_url})


async def mark_seen(
    source_url: str, run_id: str, content_hash: str, price: float | None
) -> None:
    await db().seen_listings.update_one(
        {"source_url": source_url},
        {
            "$set": {
                "content_hash": content_hash,
                "price": price,
                "last_seen_run": run_id,
                "last_seen_at": utcnow(),
            },
            "$setOnInsert": {"first_seen_at": utcnow()},
        },
        upsert=True,
    )


async def record_price_change(source_url: str, old: float, new: float) -> None:
    await db().seen_listings.update_one(
        {"source_url": source_url},
        {"$push": {"price_history": {"from": old, "to": new, "at": utcnow()}}},
    )


async def archive_stale(pending_days: int = 14, absent_runs: int = 5) -> dict:
    """End-of-run maintenance: archive queue items nobody reviewed within
    `pending_days`; mark seen listings inactive when absent from search
    results for `absent_runs` consecutive runs (they were likely delisted)."""
    from datetime import timedelta

    cutoff = utcnow() - timedelta(days=pending_days)
    archived = await db().pending.update_many(
        {"status": {"$in": ["pending", "held"]}, "created_at": {"$lt": cutoff}},
        {"$set": {"status": "archived", "archived_at": utcnow()}},
    )

    recent_run_ids = [
        r["run_id"]
        async for r in db().runs.find({}, {"run_id": 1})
        .sort("started_at", -1)
        .limit(absent_runs)
    ]
    inactive = 0
    if len(recent_run_ids) == absent_runs:
        result = await db().seen_listings.update_many(
            {"last_seen_run": {"$nin": recent_run_ids}, "status": {"$ne": "inactive"}},
            {"$set": {"status": "inactive", "inactive_at": utcnow()}},
        )
        inactive = result.modified_count

    return {"archived": archived.modified_count, "marked_inactive": inactive}
