"""Forward geocoding via Nominatim, with a permanent Mongo cache.

Ported from the scraper's `pokojowo_scraper.enrich.geocode`, which has been
running against the public Nominatim instance for a while. Two rules from its
usage policy carry over and must not be relaxed:

  * at most 1 request/second, serialized (enforced here by an asyncio lock);
  * no per-keystroke autocomplete — only resolve on an explicit save/backfill.

Results are cached forever, including misses, so steady-state cost is a single
indexed Mongo read. Never call this inside a request that a user waits on more
than once; the limiter makes bulk work slow by design.
"""
import asyncio
import logging
import re
import time
from typing import Optional, Tuple

import httpx

from app.core.config import settings
from app.core.geo import GeoPrecision, precision_rank, to_geojson_point
from app.models.geocode_cache import GeocodeCacheEntry

logger = logging.getLogger(__name__)

_lock = asyncio.Lock()
_last_call = 0.0

# Nominatim asks for a contactable identifier; a generic client string gets
# blocked. See https://operations.osmfoundation.org/policies/nominatim/
_MIN_INTERVAL_SECONDS = 1.1


async def _nominatim(query: str) -> list:
    global _last_call
    async with _lock:
        wait = _MIN_INTERVAL_SECONDS - (time.monotonic() - _last_call)
        if wait > 0:
            await asyncio.sleep(wait)
        _last_call = time.monotonic()

    async with httpx.AsyncClient(
        timeout=settings.NOMINATIM_TIMEOUT_SECONDS,
        headers={"User-Agent": settings.NOMINATIM_USER_AGENT},
    ) as client:
        response = await client.get(
            f"{settings.NOMINATIM_URL.rstrip('/')}/search",
            params={
                "q": query,
                "format": "json",
                "countrycodes": settings.NOMINATIM_COUNTRY_CODES,
                "limit": 1,
            },
        )
        response.raise_for_status()
        return response.json()


def _key(*parts: Optional[str]) -> str:
    return "|".join((p or "").strip().lower() for p in parts)


async def _cached_lookup(key: str, query: str) -> Optional[Tuple[float, float]]:
    """Returns `(latitude, longitude)`, or None for a miss or a transient error."""
    cached = await GeocodeCacheEntry.find_one(GeocodeCacheEntry.key == key)
    if cached:
        if cached.miss or cached.latitude is None or cached.longitude is None:
            return None
        return cached.latitude, cached.longitude

    try:
        results = await _nominatim(query)
    except (httpx.HTTPError, ValueError) as exc:
        # Transient — don't poison the cache with a failure we can retry
        logger.warning("Nominatim lookup failed for %r: %s", query, exc)
        return None

    entry = GeocodeCacheEntry(key=key, query=query)
    if results:
        try:
            entry.latitude = float(results[0]["lat"])
            entry.longitude = float(results[0]["lon"])
        except (KeyError, TypeError, ValueError):
            entry.miss = True
    else:
        entry.miss = True

    try:
        await entry.insert()
    except Exception:
        # A concurrent request won the unique-key race; its value is equivalent.
        logger.debug("Geocode cache entry for %r already existed", key)

    if entry.miss:
        return None
    return entry.latitude, entry.longitude


async def geocode(
    address: Optional[str] = None,
    city: Optional[str] = None,
    district: Optional[str] = None,
) -> Optional[Tuple[dict, GeoPrecision]]:
    """Resolve the most precise point available for a place.

    Walks street → district → city and reports which level actually
    resolved, so callers can tell a rooftop pin from a city centroid.
    Returns `(geojson_point, precision)` or None.
    """
    address = (address or "").strip() or None
    city = (city or "").strip() or None
    district = (district or "").strip() or None

    if not address and not city:
        return None

    attempts = []
    # Skip a pointless street lookup when the "address" is just "District, City"
    location_only = ", ".join(p for p in (district, city) if p)
    if address and address.lower() != location_only.lower():
        attempts.append((GeoPrecision.STREET, _key("a", address), f"{address}, Polska"))
        # Landlords often append a blurb ("Mokotów, Warszawa - bright room"),
        # which matches nothing, so retry with just the part before the dash.
        head = re.split(r"\s+[-–—]\s+", address, maxsplit=1)[0].strip()
        if head and head.lower() != address.lower():
            attempts.append((GeoPrecision.DISTRICT, _key("a", head), f"{head}, Polska"))
    if city and district:
        attempts.append(
            (
                GeoPrecision.DISTRICT,
                _key("d", city, district),
                f"{district}, {city}, Polska",
            )
        )
    if city:
        attempts.append((GeoPrecision.CITY, _key("c", city), f"{city}, Polska"))

    for precision, key, query in attempts:
        result = await _cached_lookup(key, query)
        if result:
            latitude, longitude = result
            return to_geojson_point(latitude, longitude), precision

    return None


async def geocode_if_missing(
    location_geo: Optional[dict],
    current_precision: Optional[str],
    address: Optional[str] = None,
    city: Optional[str] = None,
    district: Optional[str] = None,
) -> Optional[Tuple[dict, GeoPrecision]]:
    """Geocode only when it would improve on what's already stored.

    Coordinates supplied by the client (a dropped pin) or by the scraper are
    `EXACT` and must never be overwritten by a geocoded approximation.
    """
    if location_geo and precision_rank(current_precision) >= precision_rank(GeoPrecision.STREET):
        return None
    return await geocode(address=address, city=city, district=district)
