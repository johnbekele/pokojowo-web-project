"""Proximity POIs (closeTo) via Overpass, cached per geohash-6 cell
(~±600 m) so co-located listings share one query."""

import asyncio
import logging

import httpx
import pygeohash

from pokojowo_scraper.config import settings
from pokojowo_scraper.schemas import ExtractedListing, GeoPrecision, fv
from pokojowo_scraper.store import db, utcnow

logger = logging.getLogger(__name__)

_lock = asyncio.Lock()  # ≤1 concurrent Overpass request

# closeTo vocabulary -> (radius m, overpass selector)
POI_QUERIES: dict[str, tuple[int, str]] = {
    "Metro": (800, 'node["station"="subway"]'),
    "Train Station": (800, 'node["railway"="station"]'),
    "Tram Stop": (500, 'node["railway"="tram_stop"]'),
    "Bus Stop": (400, 'node["highway"="bus_stop"]'),
    "School": (600, 'node["amenity"~"school|kindergarten"]'),
    "University": (1000, 'node["amenity"="university"]'),
    "Park": (500, 'way["leisure"="park"]'),
    "Supermarket": (500, 'node["shop"~"supermarket|convenience"]'),
    "Pharmacy": (500, 'node["amenity"="pharmacy"]'),
    "Gym": (600, 'node["leisure"="fitness_centre"]'),
}


def _build_query(lat: float, lon: float) -> str:
    parts = [
        f'{selector}(around:{radius},{lat},{lon});out count;'
        for radius, selector in POI_QUERIES.values()
    ]
    return "[out:json][timeout:25];" + "".join(parts)


async def nearby_pois(lat: float, lon: float) -> list[str] | None:
    """POI categories near a point, cached by geohash-6. None on failure."""
    cell = pygeohash.encode(lat, lon, precision=6)
    cache = db().poi_cache
    if hit := await cache.find_one({"geohash": cell}):
        return hit["pois"]

    async with _lock:
        try:
            async with httpx.AsyncClient(
                timeout=40, headers={"User-Agent": settings.geo_user_agent}
            ) as client:
                resp = await client.post(
                    settings.overpass_url, data={"data": _build_query(lat, lon)}
                )
                resp.raise_for_status()
                elements = resp.json().get("elements", [])
        except (httpx.HTTPError, ValueError) as e:
            logger.warning("overpass error at %s: %s", cell, e)
            return None

    # `out count;` yields one count element per statement, in query order
    counts = [
        int(el.get("tags", {}).get("total", 0))
        for el in elements
        if el.get("type") == "count"
    ]
    pois = [
        name for name, count in zip(POI_QUERIES, counts) if count > 0
    ]
    await cache.update_one(
        {"geohash": cell},
        {"$set": {"pois": pois, "created_at": utcnow()}},
        upsert=True,
    )
    return pois


async def enrich_close_to(listing: ExtractedListing) -> ExtractedListing:
    """Add verified POIs to closeTo. Only for street-or-better coordinates —
    a district centroid would attribute the wrong neighbourhood's POIs."""
    if listing.coordinates is None or listing.geo_precision not in (
        GeoPrecision.EXACT,
        GeoPrecision.STREET,
    ):
        return listing
    coords = listing.coordinates.value
    pois = await nearby_pois(coords.latitude, coords.longitude)
    if pois is None:
        return listing
    existing = listing.close_to.value if listing.close_to else []
    merged = list(dict.fromkeys(pois + existing))  # verified POIs first, dedup
    if merged:
        listing.close_to = fv(merged, "overpass")
    return listing
