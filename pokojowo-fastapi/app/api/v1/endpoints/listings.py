from fastapi import APIRouter, HTTPException, status, Depends, Query, Header
from pydantic import BaseModel
from app.schemas.listing_schema import ListingCreate, ListingUpdate, ListingResponse
from app.models.listing import Listing
from app.models.user import User
from app.core.dependencies import get_current_user, require_verified
from app.core.config import settings
from app.core.geo import (
    CLUSTER_ZOOM_THRESHOLD,
    GeoPrecision,
    bbox_clause,
    cluster_cell_size,
    coords_from_geo,
    parse_bbox,
)
from app.core.locations import CITY_DISTRICTS, canonical_city, districts_for_city
from typing import List, Optional
from datetime import datetime
import re
import secrets

# IMPORTANT — two traps in this file:
# 1. Route ordering: FastAPI matches routes in declaration order, so every
#    static path (/my-listings, /scraped, /owner/..., /import) MUST be
#    declared BEFORE the dynamic GET /{listing_id} route.
# 2. Field names: Beanie stores documents under the camelCase aliases
#    (roomType, ownerId, isScraped, createdAt, ...). Raw-dict Mongo queries
#    MUST use the alias names, never the snake_case attribute names.

router = APIRouter()


class ScrapedListingImport(BaseModel):
    """Schema for importing scraped listings from external sources."""
    address: str
    price: float
    size: float
    maxTenants: int = 1
    images: List[str] = []
    description: dict  # {en: "", pl: ""}
    availableFrom: Optional[str] = None
    roomType: str = "Single"
    buildingType: str = "Apartment"
    rentForOnly: List[str] = ["Open to All"]
    canBeContacted: List[str] = ["Message"]
    closeTo: List[str] = []
    AIHelp: bool = False
    # Scraped-specific fields
    sourceUrl: str  # Required - link to original post
    sourceSite: str  # Required - olx, otodom, etc.
    phone: Optional[str] = None
    # Structured location (optional; scraper forwards when available)
    city: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    # exact | street | district | city — the scraper knows whether the site
    # embedded coordinates or it geocoded them itself. Defaults to exact.
    geoPrecision: Optional[str] = None
    # owner | agency | unknown (scraper maps Prywatne/Firmowe etc.)
    offeredBy: Optional[str] = None


def listing_to_dict(listing: Listing) -> dict:
    """Serialize a Listing document to the camelCase API response shape."""
    return {
        "_id": str(listing.id),
        "ownerId": listing.owner_id,
        "address": listing.address,
        "city": listing.city,
        "district": listing.district,
        "locationGeo": listing.location_geo,
        "geoPrecision": listing.geo_precision,
        "price": listing.price,
        "size": listing.size,
        "maxTenants": listing.max_tenants,
        "images": listing.images,
        "description": listing.description,
        "phone": listing.phone,
        "availableFrom": listing.available_from,
        "roomType": listing.room_type.value if listing.room_type else None,
        "buildingType": listing.building_type.value if listing.building_type else None,
        "rentForOnly": [r.value for r in listing.rent_for_only or []],
        "canBeContacted": listing.can_be_contacted,
        "closeTo": listing.close_to,
        "AIHelp": listing.ai_help,
        "offeredBy": listing.offered_by.value if listing.offered_by else "unknown",
        "isScraped": listing.is_scraped,
        "sourceUrl": listing.source_url,
        "sourceSite": listing.source_site,
        "createdAt": listing.created_at,
        "updatedAt": listing.updated_at
    }


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_listing(
    listing_data: ListingCreate,
    current_user: User = Depends(require_verified)
):
    """Create a new listing"""
    # Check if user is a landlord
    if not current_user.is_landlord:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only landlords can create listings"
        )

    # Create listing — platform landlords offer their own property
    from app.models.listing import OfferedByEnum
    listing = Listing(
        owner_id=str(current_user.id),
        offered_by=OfferedByEnum.OWNER,
        **listing_data.dict(by_alias=True)
    )

    # Coordinates the client sent came from a dropped pin, so they outrank
    # anything we could geocode from the address text.
    if listing.location_geo:
        listing.geo_precision = GeoPrecision.EXACT.value

    await listing.insert()

    # Fire-and-forget: notify users whose saved search matches this listing.
    import asyncio
    from app.services import saved_search_service
    asyncio.create_task(saved_search_service.notify_matching_saved_searches(listing))

    # Also fire-and-forget: geocoding is rate-limited to 1 req/s, far too slow
    # to hold a create request open. The pin appears a moment later.
    if not listing.location_geo:
        from app.services.geo_enrichment import resolve_listing_geo_by_id
        asyncio.create_task(resolve_listing_geo_by_id(str(listing.id)))

    return {
        "message": "Listing created successfully",
        "listing_id": str(listing.id)
    }


def build_listing_query(
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_size: Optional[float] = None,
    max_size: Optional[float] = None,
    room_type: Optional[List[str]] = None,
    building_type: Optional[List[str]] = None,
    rent_for: Optional[List[str]] = None,
    max_tenants: Optional[int] = None,
    city: Optional[str] = None,
    district: Optional[List[str]] = None,
    offered_by: Optional[str] = None,
    bbox: Optional[str] = None,
) -> dict:
    """Build the Mongo query for a listing search.

    Shared by the list view and the map view so the two can never disagree
    about what a given set of filters means. Keys are the stored camelCase
    aliases (see the note at the top of this file).

    room_type, building_type, rent_for and district match listings containing
    ANY of the given values. The district filter also matches the district name
    inside the legacy free-text address, so pre-migration listings still
    surface.

    offered_by is deliberately asymmetric: 'owner' excludes only
    agency-tagged listings (untagged legacy listings stay visible),
    while 'agency' matches strictly.
    """
    query = {}

    # Text search on address and description
    if search:
        query["$or"] = [
            {"address": {"$regex": search, "$options": "i"}},
            {"description.en": {"$regex": search, "$options": "i"}},
            {"description.pl": {"$regex": search, "$options": "i"}},
            # Mongo applies the regex to each element of the string array
            {"closeTo": {"$regex": search, "$options": "i"}}
        ]

    # Price filter
    if min_price is not None:
        query["price"] = {"$gte": min_price}

    if max_price is not None:
        if "price" in query:
            query["price"]["$lte"] = max_price
        else:
            query["price"] = {"$lte": max_price}

    # Size filter
    if min_size is not None:
        query["size"] = {"$gte": min_size}

    if max_size is not None:
        if "size" in query:
            query["size"]["$lte"] = max_size
        else:
            query["size"] = {"$lte": max_size}

    if room_type:
        query["roomType"] = {"$in": room_type}

    if building_type:
        query["buildingType"] = {"$in": building_type}

    if rent_for:
        query["rentForOnly"] = {"$in": rent_for}

    if max_tenants is not None:
        query["maxTenants"] = {"$lte": max_tenants}

    if city:
        city_name = canonical_city(city)
        # Match the structured field or the legacy free-text address
        city_clause = {"$or": [
            {"city": {"$regex": f"^{re.escape(city_name)}$", "$options": "i"}},
            {"address": {"$regex": re.escape(city), "$options": "i"}},
            {"address": {"$regex": re.escape(city_name), "$options": "i"}},
        ]}
        query.setdefault("$and", []).append(city_clause)

    if district:
        districts = [d.strip() for d in district if d and d.strip()]
        if districts:
            district_clause = {"$or": [
                {"district": {"$in": districts}},
                # Legacy fallback: district name inside the address string
                {"address": {"$regex": "|".join(re.escape(d) for d in districts), "$options": "i"}},
            ]}
            query.setdefault("$and", []).append(district_clause)

    if offered_by == "owner":
        query["offeredBy"] = {"$nin": ["agency"]}
    elif offered_by == "agency":
        query["offeredBy"] = "agency"

    # Restrict to the visible map area. Implicitly drops listings without
    # coordinates, which is what a map view wants.
    if bbox:
        query.update(bbox_clause(parse_bbox(bbox)))

    return query


def listing_sort_field(sort: Optional[str]) -> str:
    if sort == "price_asc":
        return "+price"
    if sort == "price_desc":
        return "-price"
    if sort == "oldest":
        return "+createdAt"
    return "-createdAt"  # Default: newest first


@router.get("", response_model=List[dict])
@router.get("/", response_model=List[dict])
async def get_listings(
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    sort: Optional[str] = "newest",
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_size: Optional[float] = None,
    max_size: Optional[float] = None,
    room_type: Optional[List[str]] = Query(None),
    building_type: Optional[List[str]] = Query(None),
    rent_for: Optional[List[str]] = Query(None),
    max_tenants: Optional[int] = None,
    city: Optional[str] = None,
    district: Optional[List[str]] = Query(None),
    offered_by: Optional[str] = None,
    bbox: Optional[str] = Query(
        None,
        description="Restrict to 'swLng,swLat,neLng,neLat'. Keeps the map "
                    "view's side list in sync with the visible area.",
    ),
):
    """Get all listings with optional filtering, search, and sorting.

    See build_listing_query for how each filter is interpreted.
    """
    query = build_listing_query(
        search=search,
        min_price=min_price,
        max_price=max_price,
        min_size=min_size,
        max_size=max_size,
        room_type=room_type,
        building_type=building_type,
        rent_for=rent_for,
        max_tenants=max_tenants,
        city=city,
        district=district,
        offered_by=offered_by,
        bbox=bbox,
    )

    listings = (
        await Listing.find(query)
        .sort(listing_sort_field(sort))
        .skip(skip)
        .limit(limit)
        .to_list()
    )

    return [listing_to_dict(listing) for listing in listings]


# A map view can legitimately cover thousands of listings; cap the pin payload
# and tell the client it is looking at a partial picture.
MAP_PIN_LIMIT = 400
MAP_CLUSTER_LIMIT = 300


@router.get("/map", response_model=dict)
async def get_listings_map(
    bbox: str = Query(..., description="Visible area as 'swLng,swLat,neLng,neLat'"),
    zoom: int = Query(12, ge=0, le=22, description="Current map zoom level"),
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_size: Optional[float] = None,
    max_size: Optional[float] = None,
    room_type: Optional[List[str]] = Query(None),
    building_type: Optional[List[str]] = Query(None),
    rent_for: Optional[List[str]] = Query(None),
    max_tenants: Optional[int] = None,
    city: Optional[str] = None,
    district: Optional[List[str]] = Query(None),
    offered_by: Optional[str] = None,
):
    """Listings inside the visible map area, as pins or cluster bubbles.

    Zoomed out (below CLUSTER_ZOOM_THRESHOLD) individual pins would be
    thousands of overlapping dots, so the response is grid-aggregated counts
    instead. Zoomed in it returns lean pins — enough to draw a price bubble
    and a preview card, not the full listing.

    Accepts the same filters as GET /listings/ so the map and list agree.
    """
    query = build_listing_query(
        search=search,
        min_price=min_price,
        max_price=max_price,
        min_size=min_size,
        max_size=max_size,
        room_type=room_type,
        building_type=building_type,
        rent_for=rent_for,
        max_tenants=max_tenants,
        city=city,
        district=district,
        offered_by=offered_by,
        bbox=bbox,
    )

    collection = Listing.get_motor_collection()

    if zoom < CLUSTER_ZOOM_THRESHOLD:
        cell = cluster_cell_size(zoom)
        pipeline = [
            {"$match": query},
            {
                "$group": {
                    "_id": {
                        "x": {"$floor": {"$divide": [
                            {"$arrayElemAt": ["$locationGeo.coordinates", 0]}, cell,
                        ]}},
                        "y": {"$floor": {"$divide": [
                            {"$arrayElemAt": ["$locationGeo.coordinates", 1]}, cell,
                        ]}},
                    },
                    "count": {"$sum": 1},
                    # Average position keeps the bubble over the listings it
                    # represents rather than at an empty cell centre.
                    "lng": {"$avg": {"$arrayElemAt": ["$locationGeo.coordinates", 0]}},
                    "lat": {"$avg": {"$arrayElemAt": ["$locationGeo.coordinates", 1]}},
                    "minPrice": {"$min": "$price"},
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": MAP_CLUSTER_LIMIT},
        ]

        clusters = []
        total = 0
        async for row in collection.aggregate(pipeline):
            if row.get("lat") is None or row.get("lng") is None:
                continue
            total += row["count"]
            clusters.append({
                "id": f"{row['_id']['x']}:{row['_id']['y']}",
                "lat": row["lat"],
                "lng": row["lng"],
                "count": row["count"],
                "minPrice": row.get("minPrice"),
            })

        return {
            "mode": "clusters",
            "zoom": zoom,
            "clusters": clusters,
            "pins": [],
            "total": total,
            "truncated": len(clusters) >= MAP_CLUSTER_LIMIT,
        }

    total = await collection.count_documents(query)
    listings = (
        await Listing.find(query)
        .sort("-createdAt")
        .limit(MAP_PIN_LIMIT)
        .to_list()
    )

    pins = []
    for listing in listings:
        coords = coords_from_geo(listing.location_geo)
        if not coords:
            continue
        lng, lat = coords
        pins.append({
            "id": str(listing.id),
            "lat": lat,
            "lng": lng,
            "price": listing.price,
            "size": listing.size,
            "roomType": listing.room_type.value if listing.room_type else None,
            "district": listing.district,
            "city": listing.city,
            "address": listing.address,
            # A pin popup shows one thumbnail; the rest is dead weight here.
            "image": listing.images[0] if listing.images else None,
        })

    return {
        "mode": "pins",
        "zoom": zoom,
        "clusters": [],
        "pins": pins,
        "total": total,
        "truncated": total > len(pins),
    }


@router.get("/meta/districts", response_model=dict)
async def get_districts(city: Optional[str] = None):
    """Curated district suggestions. With ?city= returns that city's
    districts; without, returns the full city->districts map."""
    if city:
        return {"city": canonical_city(city), "districts": districts_for_city(city)}
    return {"cities": CITY_DISTRICTS}


@router.get("/my-listings", response_model=List[dict])
async def get_my_listings(
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 20
):
    """Get current user's listings (for landlords)"""
    if not current_user.is_landlord:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only landlords can view their listings"
        )

    listings = await Listing.find({"ownerId": str(current_user.id)}).skip(skip).limit(limit).to_list()

    return [listing_to_dict(listing) for listing in listings]


@router.get("/scraped", response_model=List[dict])
async def get_scraped_listings(
    skip: int = 0,
    limit: int = 20,
    source_site: Optional[str] = None
):
    """Get all scraped listings, optionally filtered by source site."""
    query = {"isScraped": True}
    if source_site:
        query["sourceSite"] = source_site

    listings = await Listing.find(query).sort("-createdAt").skip(skip).limit(limit).to_list()

    return [listing_to_dict(listing) for listing in listings]


@router.get("/owner/{owner_id}", response_model=List[dict])
async def get_listings_by_owner(owner_id: str, skip: int = 0, limit: int = 20):
    """Get all listings by owner ID"""
    listings = await Listing.find({"ownerId": owner_id}).skip(skip).limit(limit).to_list()

    return [listing_to_dict(listing) for listing in listings]


@router.post("/import", response_model=dict, status_code=status.HTTP_201_CREATED)
async def import_scraped_listing(
    listing_data: ScrapedListingImport,
    x_scraper_key: Optional[str] = Header(None)
):
    """
    Import a scraped listing from external sources (OLX, Otodom, etc.)
    Requires the shared scraper key in the X-Scraper-Key header.
    """
    if not settings.SCRAPER_API_KEY or not x_scraper_key or not secrets.compare_digest(
        x_scraper_key, settings.SCRAPER_API_KEY
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid X-Scraper-Key header is required"
        )

    from app.models.listing import RoomTypeEnum, BuildingTypeEnum, RentForEnum, OfferedByEnum

    # Check for duplicate by source URL (stored under the camelCase alias)
    existing = await Listing.find_one({"sourceUrl": listing_data.sourceUrl})
    if existing:
        return {
            "message": "Listing already exists",
            "listing_id": str(existing.id),
            "duplicate": True
        }

    # Parse room type
    try:
        room_type = RoomTypeEnum(listing_data.roomType)
    except ValueError:
        room_type = RoomTypeEnum.SINGLE

    # Parse building type
    try:
        building_type = BuildingTypeEnum(listing_data.buildingType)
    except ValueError:
        building_type = BuildingTypeEnum.APARTMENT

    # Parse rent for only
    rent_for_only = []
    for r in listing_data.rentForOnly:
        try:
            rent_for_only.append(RentForEnum(r))
        except ValueError:
            rent_for_only.append(RentForEnum.OPEN_TO_ALL)
    if not rent_for_only:
        rent_for_only = [RentForEnum.OPEN_TO_ALL]

    # Parse available from date
    available_from = datetime.utcnow()
    if listing_data.availableFrom:
        try:
            available_from = datetime.fromisoformat(listing_data.availableFrom.replace('Z', '+00:00'))
        except:
            pass

    location_geo = None
    geo_precision = None
    if listing_data.latitude is not None and listing_data.longitude is not None:
        location_geo = {
            "type": "Point",
            "coordinates": [listing_data.longitude, listing_data.latitude]
        }
        try:
            geo_precision = GeoPrecision(listing_data.geoPrecision or "exact").value
        except ValueError:
            geo_precision = GeoPrecision.EXACT.value

    try:
        offered_by = OfferedByEnum(listing_data.offeredBy or "unknown")
    except ValueError:
        offered_by = OfferedByEnum.UNKNOWN

    # Create listing with scraped flag
    listing = Listing(
        owner_id="scraped",  # Special owner ID for scraped listings
        address=listing_data.address,
        city=canonical_city(listing_data.city) if listing_data.city else None,
        district=listing_data.district,
        location_geo=location_geo,
        geo_precision=geo_precision,
        price=listing_data.price,
        size=listing_data.size,
        max_tenants=listing_data.maxTenants,
        images=listing_data.images,
        description=listing_data.description,
        available_from=available_from,
        room_type=room_type,
        building_type=building_type,
        rent_for_only=rent_for_only,
        can_be_contacted=listing_data.canBeContacted,
        close_to=listing_data.closeTo,
        ai_help=listing_data.AIHelp,
        offered_by=offered_by,
        # Scraped-specific fields
        is_scraped=True,
        source_url=listing_data.sourceUrl,
        source_site=listing_data.sourceSite,
        phone=listing_data.phone,
    )

    await listing.insert()

    # Fire-and-forget: notify users whose saved search matches this listing.
    import asyncio
    from app.services import saved_search_service
    asyncio.create_task(saved_search_service.notify_matching_saved_searches(listing))

    # Some source sites don't embed coordinates; resolve them from the address
    # so imported listings still appear on the map.
    if not listing.location_geo:
        from app.services.geo_enrichment import resolve_listing_geo_by_id
        asyncio.create_task(resolve_listing_geo_by_id(str(listing.id)))

    return {
        "message": "Scraped listing imported successfully",
        "listing_id": str(listing.id),
        "duplicate": False
    }


# ============================================================================
# Dynamic /{listing_id} routes — keep these LAST (see note at top of file)
# ============================================================================

@router.get("/{listing_id}", response_model=dict)
async def get_listing_by_id(listing_id: str):
    """Get listing by ID (with the owner's public trust info)"""
    listing = await Listing.get(listing_id)

    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )

    result = listing_to_dict(listing)

    # Attach owner trust/badge data for non-scraped listings
    if listing.owner_id and listing.owner_id != "scraped":
        owner = await User.get(listing.owner_id)
        if owner:
            from app.services.trust_service import trust_level
            result["owner"] = {
                "id": str(owner.id),
                "username": owner.username,
                "firstname": owner.firstname,
                "lastname": owner.lastname,
                "photo": owner.photo.url if owner.photo else None,
                "is_verified": owner.is_verified,
                "phoneVerified": owner.phone_verified,
                "trustLevel": trust_level(owner),
                "trustScore": owner.trust_score,
                "isVerifiedLandlord": bool(
                    owner.landlord_profile
                    and owner.landlord_profile.verification
                    and owner.landlord_profile.verification.is_verified_landlord
                ),
            }

    return result


@router.put("/{listing_id}", response_model=dict)
async def update_listing(
    listing_id: str,
    listing_data: ListingUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a listing"""
    listing = await Listing.get(listing_id)

    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )

    # Check if user is the owner
    if listing.owner_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own listings"
        )

    # Update listing
    update_data = listing_data.dict(exclude_unset=True, by_alias=True)

    for field, value in update_data.items():
        setattr(listing, field, value)

    if "locationGeo" in update_data and update_data["locationGeo"]:
        # Landlord moved the pin — that's authoritative.
        listing.geo_precision = GeoPrecision.EXACT.value
    elif {"address", "city", "district"} & set(update_data):
        # The place changed but no pin came with it; re-resolve in the
        # background rather than leaving the old coordinates in place.
        listing.location_geo = None
        listing.geo_precision = None

    listing.updated_at = datetime.utcnow()
    await listing.save()

    if not listing.location_geo:
        import asyncio
        from app.services.geo_enrichment import resolve_listing_geo_by_id
        asyncio.create_task(resolve_listing_geo_by_id(str(listing.id)))

    return {"message": "Listing updated successfully"}


@router.delete("/{listing_id}")
async def delete_listing(
    listing_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a listing"""
    listing = await Listing.get(listing_id)

    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )

    # Check if user is the owner
    if listing.owner_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own listings"
        )

    await listing.delete()

    return {"message": "Listing deleted successfully"}
