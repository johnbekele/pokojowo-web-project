"""Forward geocoding via Nominatim with a permanent Mongo cache and a
strict 1 req/s limiter (public instance usage policy). Coordinates
precedence handled by the caller: site-embedded coords always win."""

import asyncio
import logging
import time

import httpx

from pokojowo_scraper.config import settings
from pokojowo_scraper.schemas import Coordinates, ExtractedListing, GeoPrecision, fv
from pokojowo_scraper.store import db, utcnow

logger = logging.getLogger(__name__)

_lock = asyncio.Lock()
_last_call = 0.0


async def _nominatim(params: dict) -> list[dict]:
    global _last_call
    async with _lock:  # 1 rps, serialized
        wait = 1.1 - (time.monotonic() - _last_call)
        if wait > 0:
            await asyncio.sleep(wait)
        _last_call = time.monotonic()
    async with httpx.AsyncClient(
        timeout=20, headers={"User-Agent": settings.geo_user_agent}
    ) as client:
        resp = await client.get(
            f"{settings.nominatim_url}/search",
            params={**params, "format": "json", "countrycodes": "pl", "limit": 1},
        )
        resp.raise_for_status()
        return resp.json()


async def _cached_lookup(key: str, query: str) -> dict | None:
    """Returns {"lat": .., "lon": ..} or {"miss": True} sentinel, cached forever."""
    cache = db().geocode_cache
    if hit := await cache.find_one({"key": key}):
        return hit["result"]
    try:
        results = await _nominatim({"q": query})
    except httpx.HTTPError as e:
        logger.warning("nominatim error for %r: %s", query, e)
        return None  # transient — don't cache
    result = (
        {"lat": float(results[0]["lat"]), "lon": float(results[0]["lon"])}
        if results
        else {"miss": True}
    )
    await cache.update_one(
        {"key": key},
        {"$set": {"result": result, "query": query, "created_at": utcnow()}},
        upsert=True,
    )
    return result


def _norm(*parts: str | None) -> str:
    return "|".join((p or "").strip().lower() for p in parts)


async def geocode(listing: ExtractedListing) -> ExtractedListing:
    """Fill coordinates when the site didn't embed them, walking down
    address → district → city and recording the achieved precision."""
    if listing.coordinates is not None and listing.geo_precision == GeoPrecision.EXACT:
        return listing

    city = listing.city.value if listing.city else None
    district = listing.district.value if listing.district else None
    address = listing.address.value if listing.address else None
    if not city and not address:
        return listing

    attempts: list[tuple[GeoPrecision, str, str]] = []
    if address and address != ", ".join(p for p in (city, district) if p):
        attempts.append((GeoPrecision.STREET, _norm("a", address), f"{address}, Polska"))
    if city and district:
        attempts.append(
            (GeoPrecision.DISTRICT, _norm("d", city, district), f"{district}, {city}, Polska")
        )
    if city:
        attempts.append((GeoPrecision.CITY, _norm("c", city), f"{city}, Polska"))

    for precision, key, query in attempts:
        # don't downgrade below what we already have
        if listing.coordinates is not None and listing.geo_precision is not None:
            if _rank(precision) <= _rank(listing.geo_precision):
                break
        result = await _cached_lookup(key, query)
        if result and not result.get("miss"):
            listing.coordinates = fv(
                Coordinates(latitude=result["lat"], longitude=result["lon"]), "geocode"
            )
            listing.geo_precision = precision
            break
    return listing


_ORDER = [GeoPrecision.CITY, GeoPrecision.DISTRICT, GeoPrecision.STREET, GeoPrecision.EXACT]


def _rank(p: GeoPrecision) -> int:
    return _ORDER.index(p)
