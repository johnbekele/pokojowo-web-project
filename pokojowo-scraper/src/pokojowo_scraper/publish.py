"""Publish listings to the main Pokojowo backend via POST /api/listings/import
(X-Scraper-Key auth, idempotent on sourceUrl). Images are downloaded from
the source CDN, downscaled, and re-hosted via POST /api/upload/scraped —
hotlinked CDN URLs die when the source listing is removed."""

import io
import logging

import httpx
from PIL import Image

from pokojowo_scraper.config import settings
from pokojowo_scraper.schemas import ExtractedListing, OfferedBy

logger = logging.getLogger(__name__)


class PublishError(Exception):
    pass


def build_import_payload(listing: ExtractedListing, image_urls: list[str]) -> dict:
    """Map an ExtractedListing to the /import contract. Callers must have
    verified gates (price/size/address/description present) beforehand."""

    def val(field):
        return field.value if field is not None else None

    payload = {
        "address": val(listing.address),
        "price": val(listing.price),
        "size": val(listing.size),
        "description": {
            "pl": val(listing.description_pl) or "",
            "en": val(listing.description_en) or "",
        },
        "sourceUrl": listing.source_url,
        "sourceSite": listing.source_site,
        "images": image_urls,
    }
    if listing.city:
        payload["city"] = listing.city.value
    if listing.district:
        payload["district"] = listing.district.value
    if listing.coordinates:
        payload["latitude"] = listing.coordinates.value.latitude
        payload["longitude"] = listing.coordinates.value.longitude
    if listing.offered_by:
        payload["offeredBy"] = listing.offered_by.value
    # A phone number scraped from an owner's listing is personal data. Do not
    # republish it until a documented lawful basis and takedown process exist.
    # Agency contacts remain eligible because they represent a business
    # publisher rather than a private landlord.
    if listing.phone and listing.offered_by and listing.offered_by.value == OfferedBy.AGENCY:
        payload["phone"] = listing.phone.value
        payload["canBeContacted"] = ["Message", "Phone"]
    if listing.available_from:
        payload["availableFrom"] = listing.available_from.value.isoformat()
    if listing.room_type:
        payload["roomType"] = listing.room_type.value
    if listing.building_type:
        payload["buildingType"] = listing.building_type.value
    if listing.rent_for_only:
        payload["rentForOnly"] = listing.rent_for_only.value
    if listing.max_tenants:
        payload["maxTenants"] = listing.max_tenants.value
    if listing.close_to:
        payload["closeTo"] = listing.close_to.value
    return payload


async def rehost_images(source_urls: list[str]) -> list[str]:
    """Download, downscale (≤image_max_px), JPEG-compress and upload to the
    backend. Returns backend-relative URLs; skips images that fail."""
    files = []
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        for url in source_urls[: settings.max_images]:
            try:
                resp = await client.get(url)
                resp.raise_for_status()
                img = Image.open(io.BytesIO(resp.content))
                img = img.convert("RGB")
                img.thumbnail((settings.image_max_px, settings.image_max_px))
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=82)
                files.append(("files", ("scraped.jpg", buf.getvalue(), "image/jpeg")))
            except Exception as e:  # bad CDN images are common; skip, don't abort
                logger.warning("image rehost failed for %s: %s", url, e)

    if not files:
        return []

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{settings.pokojowo_api_url}/api/upload/scraped",
            headers={"X-Scraper-Key": settings.pokojowo_api_key},
            files=files,
        )
        if resp.status_code == 401:
            raise PublishError("backend rejected X-Scraper-Key for image upload")
        resp.raise_for_status()
        return resp.json().get("urls", [])


async def publish(listing: ExtractedListing) -> dict:
    """Re-host images then import. Returns backend response
    ({listing_id, duplicate} on success)."""
    source_images = listing.images.value if listing.images else []
    hosted = await rehost_images(source_images)
    if not hosted:
        raise PublishError("no images could be re-hosted")

    payload = build_import_payload(listing, hosted)
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{settings.pokojowo_api_url}/api/listings/import",
            headers={"X-Scraper-Key": settings.pokojowo_api_key},
            json=payload,
        )
        if resp.status_code == 401:
            raise PublishError("backend rejected X-Scraper-Key (is SCRAPER_API_KEY set?)")
        resp.raise_for_status()
        return resp.json()
