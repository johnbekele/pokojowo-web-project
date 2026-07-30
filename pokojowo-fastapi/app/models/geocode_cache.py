"""Permanent cache of Nominatim forward-geocoding results.

Nominatim's public instance allows 1 request/second, so every resolved
(and every unresolved) query is kept forever — addresses don't move, and
a cached miss stops us re-asking for a string that will never resolve.
Mirrors the scraper's `geocode_cache` collection so both services can
share a database without conflicting shapes.
"""
from datetime import datetime
from typing import Optional

from beanie import Document, Indexed
from pydantic import Field


class GeocodeCacheEntry(Document):
    # Normalized lookup key, e.g. "d|warszawa|mokotów" — see geocode_service._key
    key: Indexed(str, unique=True)
    # The literal query sent to Nominatim, kept for debugging cache misses
    query: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    # True when Nominatim returned no result for this query
    miss: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")

    class Settings:
        name = "geocode_cache"

    class Config:
        populate_by_name = True
