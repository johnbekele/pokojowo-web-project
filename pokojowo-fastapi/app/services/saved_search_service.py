"""
Saved-search matching engine + notification fan-out.

Event-driven: called (fire-and-forget) after a new listing is inserted, from
both the user-created and scraper-imported paths. There is NO scheduler in
this repo by design (see app/models/pass_model.py), so matching runs inline
off the insert.

`listing_matches_filters` is a pure predicate that mirrors the Mongo query in
`listings.get_listings` exactly, so what a saved search matches here is what
the /discover feed would have returned for the same filters.
"""
import asyncio
import logging
from datetime import datetime, timedelta

from app.models.listing import Listing
from app.models.notification import NotificationTypeEnum
from app.models.saved_search import SavedSearch
from app.models.user import User
from app.core.config import settings
from app.core.locations import canonical_city
from app.services.email_service import email_service
from app.services.notification_service import notification_service

logger = logging.getLogger(__name__)

# Per-search throttle: at most one match notification per hour, so a burst of
# scraped imports can't spam a user.
SAVED_SEARCH_NOTIFY_COOLDOWN = timedelta(hours=1)


def listing_matches_filters(listing: Listing, search: SavedSearch) -> bool:
    """Return True if ``listing`` satisfies every filter set on ``search``.

    Pure — no I/O. An empty/unset filter is no constraint, so a saved search
    with only a name matches every listing. Mirrors get_listings' Mongo query
    (listings.py) field-for-field, including the deliberate asymmetries around
    city/district legacy fallbacks and offeredBy.
    """
    # Free-text search: case-insensitive substring over address, description
    # (en/pl) and close_to — matching the Mongo $or / $regex block.
    if search.search:
        term = search.search.lower()
        desc = listing.description or {}
        haystacks = [listing.address, desc.get("en"), desc.get("pl")]
        in_text = any(term in h.lower() for h in haystacks if h)
        in_close_to = any(term in c.lower() for c in (listing.close_to or []) if c)
        if not (in_text or in_close_to):
            return False

    # Price (inclusive on both bounds).
    if search.min_price is not None and listing.price < search.min_price:
        return False
    if search.max_price is not None and listing.price > search.max_price:
        return False

    # Size (inclusive on both bounds).
    if search.min_size is not None and listing.size < search.min_size:
        return False
    if search.max_size is not None and listing.size > search.max_size:
        return False

    # roomTypes / buildingTypes: listing value must be one of the requested
    # values. Enums stored as their .value.
    if search.room_types:
        room_value = listing.room_type.value if listing.room_type else None
        if room_value not in search.room_types:
            return False

    if search.building_types:
        building_value = listing.building_type.value if listing.building_type else None
        if building_value not in search.building_types:
            return False

    # rentFor: any overlap with the listing's rent_for_only (Mongo $in on the
    # stored array).
    if search.rent_for:
        listing_rent_for = {r.value for r in (listing.rent_for_only or [])}
        if not (set(search.rent_for) & listing_rent_for):
            return False

    # maxTenants: listing must accommodate no more than the requested cap.
    if search.max_tenants is not None and listing.max_tenants > search.max_tenants:
        return False

    # city: canonical equality on the structured field OR the city name as a
    # substring of the legacy free-text address (legacy listings have city=None).
    if search.city:
        raw = search.city
        canon = canonical_city(raw)
        matched = False
        if listing.city and listing.city.lower() == canon.lower():
            matched = True
        elif listing.address:
            addr_lower = listing.address.lower()
            if raw.lower() in addr_lower or canon.lower() in addr_lower:
                matched = True
        if not matched:
            return False

    # districts: structured district in the list OR any district name as a
    # substring of the address (legacy fallback).
    districts = [d.strip() for d in search.districts if d and d.strip()]
    if districts:
        matched = False
        if listing.district and listing.district in districts:
            matched = True
        elif listing.address:
            addr_lower = listing.address.lower()
            if any(d.lower() in addr_lower for d in districts):
                matched = True
        if not matched:
            return False

    # offeredBy: keep the get_listings asymmetry. "owner" excludes only
    # agency-tagged listings (unknown/None counts as owner); "agency" is exact.
    offered_value = listing.offered_by.value if listing.offered_by else None
    if search.offered_by == "owner":
        if offered_value == "agency":
            return False
    elif search.offered_by == "agency":
        if offered_value != "agency":
            return False

    return True


async def notify_matching_saved_searches(listing: Listing) -> None:
    """Notify every user whose enabled saved search matches ``listing``.

    Fire-and-forget: any failure is logged and swallowed so it can never fail
    the listing creation that scheduled it.
    """
    try:
        owner_id = str(listing.owner_id) if listing.owner_id else None
        searches = await SavedSearch.find({"notifyEnabled": True}).to_list()

        for search in searches:
            # Never notify the owner about their own listing.
            if owner_id and search.user_id == owner_id:
                continue
            if not listing_matches_filters(listing, search):
                continue

            # Claim the cooldown atomically BEFORE sending, so concurrent
            # scraper imports of matching listings can't double-send: only the
            # writer that flips lastNotifiedAt proceeds.
            now = datetime.utcnow()
            claimed = await SavedSearch.get_motor_collection().find_one_and_update(
                {
                    "_id": search.id,
                    "$or": [
                        {"lastNotifiedAt": None},
                        {"lastNotifiedAt": {"$lt": now - SAVED_SEARCH_NOTIFY_COOLDOWN}},
                    ],
                },
                {"$set": {"lastNotifiedAt": now}},
            )
            if not claimed:
                # Still in cooldown (or already claimed by a concurrent task).
                continue

            await _notify_one(listing, search)
    except Exception as e:  # noqa: BLE001 — never let notifications break inserts
        logger.error(f"Failed saved-search fan-out for listing {getattr(listing, 'id', '?')}: {e}")


async def _notify_one(listing: Listing, search: SavedSearch) -> None:
    """Deliver the triple-channel notification (socket + stored + email)."""
    user_id = search.user_id
    listing_id = str(listing.id)
    title = "New listing matches your search"
    message = f'A new listing matches your saved search "{search.name}"'
    data = {
        "savedSearchId": str(search.id),
        "savedSearchName": search.name,
        "listingId": listing_id,
        "type": "saved_search_match",
    }

    # Real-time socket notification (lazy import mirrors likes_service).
    try:
        from app.core.socket import send_notification
        await send_notification(user_id, {
            "type": "saved_search_match",
            "savedSearchId": str(search.id),
            "savedSearchName": search.name,
            "listingId": listing_id,
            "message": message,
        })
    except Exception as e:
        logger.error(f"Failed saved-search socket notification to {user_id}: {e}")

    # Stored in-app notification.
    try:
        await notification_service.store_notification(
            user_id=user_id,
            notification_type=NotificationTypeEnum.SAVED_SEARCH_MATCH,
            title=title,
            message=message,
            data=data,
        )
    except Exception as e:
        logger.error(f"Failed to store saved-search notification for {user_id}: {e}")

    # Throttled email (no-ops gracefully when SMTP unconfigured).
    try:
        user = await User.get(user_id)
        if user and user.email:
            url = f"{settings.FRONTEND_URL}/discover?savedSearch={search.id}"
            asyncio.create_task(email_service.send_saved_search_match_notification(
                to_email=user.email,
                search_name=search.name,
                listing_address=listing.address,
                url=url,
            ))
    except Exception as e:
        logger.error(f"Failed to send saved-search email to {user_id}: {e}")
