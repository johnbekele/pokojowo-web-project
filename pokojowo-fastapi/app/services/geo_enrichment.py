"""Fill stored coordinates from the text a user typed.

Both listings and tenant search preferences are captured as free text
("Mokotów, Warszawa"), but the map needs points. These helpers resolve that
text once and persist the result, so the geocoder is never in a read path.

Shared by the write endpoints (as a background task) and the backfill scripts.
"""
import logging
from typing import Optional

from app.core.geo import GeoPrecision, precision_rank
from app.models.listing import Listing
from app.models.user import User
from app.services import geocode_service

logger = logging.getLogger(__name__)


async def resolve_listing_geo(listing: Listing, force: bool = False) -> bool:
    """Give a listing coordinates when it has none. True when it changed.

    A listing whose point came from the source site or a landlord's dropped
    pin is left alone — geocoding an address string can only be less precise.
    """
    if not force:
        existing = await geocode_service.geocode_if_missing(
            listing.location_geo,
            listing.geo_precision,
            address=listing.address,
            city=listing.city,
            district=listing.district,
        )
    else:
        existing = await geocode_service.geocode(
            address=listing.address,
            city=listing.city,
            district=listing.district,
        )

    if not existing:
        return False

    point, precision = existing
    # Never downgrade: a district centroid must not overwrite a street match.
    if listing.location_geo and precision_rank(precision) <= precision_rank(listing.geo_precision):
        return False

    listing.location_geo = point
    listing.geo_precision = precision.value
    await listing.save()
    return True


async def resolve_listing_geo_by_id(listing_id: str) -> bool:
    """Background-task entry point: reload the doc so we don't save a stale one."""
    try:
        listing = await Listing.get(listing_id)
        if not listing:
            return False
        return await resolve_listing_geo(listing)
    except Exception as exc:
        # Fire-and-forget: a failed lookup must never surface to the client.
        logger.warning("Could not geocode listing %s: %s", listing_id, exc)
        return False


def _preferred_city_and_district(user: User) -> tuple:
    """The city/district a tenant wants to live in, from structured or free text."""
    prefs = user.tenant_profile.preferences if user.tenant_profile else None
    if not prefs:
        return None, None

    districts = prefs.districts or []
    district = districts[0] if districts else None

    # `location` is free text: newer clients send a canonical city name, older
    # ones sent anything ("City center, Mokotow"). Nominatim copes with the
    # latter as long as we hand it the whole string.
    return prefs.location, district


async def resolve_preference_geo(user: User, force: bool = False) -> bool:
    """Give a tenant's preferred area coordinates. True when it changed."""
    prefs = user.tenant_profile.preferences if user.tenant_profile else None
    if not prefs:
        return False

    city, district = _preferred_city_and_district(user)
    if not city and not district:
        return False

    if not force and prefs.location_geo and precision_rank(prefs.geo_precision) >= precision_rank(
        GeoPrecision.DISTRICT
    ):
        return False

    result = await geocode_service.geocode(city=city, district=district)
    if not result:
        return False

    point, precision = result
    prefs.location_geo = point
    prefs.geo_precision = precision.value
    await user.save()
    return True


async def resolve_preference_geo_by_id(user_id: str) -> bool:
    """Background-task entry point for the profile endpoints."""
    try:
        user = await User.get(user_id)
        if not user:
            return False
        return await resolve_preference_geo(user)
    except Exception as exc:
        logger.warning("Could not geocode preferences for user %s: %s", user_id, exc)
        return False
