"""Deduplication: sourceUrl-primary, content-hash for change detection,
cross-site near-dup via price/size blocking + perceptual image hash."""

import hashlib
import io
import logging

import httpx
import imagehash
from PIL import Image

from pokojowo_scraper.schemas import ExtractedListing
from pokojowo_scraper.store import db

logger = logging.getLogger(__name__)

PHASH_HAMMING_MAX = 8


def content_hash(listing: ExtractedListing) -> str:
    """Hash of the fields whose change should trigger an update."""
    parts = [
        str(listing.price.value if listing.price else ""),
        str(listing.available_from.value if listing.available_from else ""),
        (listing.description_pl.value[:500] if listing.description_pl else ""),
    ]
    return hashlib.sha256("|".join(parts).encode()).hexdigest()[:24]


async def image_phashes(image_urls: list[str], limit: int = 3) -> list[str]:
    """Perceptual hashes of the first N images (order-independent match)."""
    hashes = []
    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        for url in image_urls[:limit]:
            try:
                resp = await client.get(url)
                resp.raise_for_status()
                img = Image.open(io.BytesIO(resp.content))
                hashes.append(str(imagehash.phash(img)))
            except Exception as e:
                logger.debug("phash failed for %s: %s", url, e)
    return hashes


def _phash_match(a: list[str], b: list[str]) -> bool:
    for ha in a:
        for hb in b:
            if imagehash.hex_to_hash(ha) - imagehash.hex_to_hash(hb) <= PHASH_HAMMING_MAX:
                return True
    return False


async def find_cross_site_duplicate(
    listing: ExtractedListing, phashes: list[str]
) -> str | None:
    """Same flat posted on the other site? Block on (city, price ±5%,
    size ±2m²), confirm with image pHash. Returns the duplicate's
    source_url, else None."""
    if not phashes or listing.price is None or listing.size is None or listing.city is None:
        return None

    other_site = "otodom" if listing.source_site == "olx" else "olx"
    price, size = listing.price.value, listing.size.value
    cursor = db().pending.find(
        {
            "source_site": other_site,
            "listing.city.value": listing.city.value,
            "listing.price.value": {"$gte": price * 0.95, "$lte": price * 1.05},
            "listing.size.value": {"$gte": size - 2, "$lte": size + 2},
            "phashes": {"$exists": True, "$ne": []},
        }
    ).limit(50)

    async for doc in cursor:
        if _phash_match(phashes, doc["phashes"]):
            return doc["source_url"]
    return None
