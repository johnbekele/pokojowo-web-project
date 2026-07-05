from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel
from app.schemas.listing_schema import ListingCreate, ListingUpdate, ListingResponse
from app.models.listing import Listing
from app.models.user import User
from app.core.dependencies import get_current_user
from typing import List, Optional
from datetime import datetime

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


def listing_to_dict(listing: Listing) -> dict:
    """Serialize a Listing document to the camelCase API response shape."""
    return {
        "_id": str(listing.id),
        "ownerId": listing.owner_id,
        "address": listing.address,
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
        "isScraped": listing.is_scraped,
        "sourceUrl": listing.source_url,
        "sourceSite": listing.source_site,
        "createdAt": listing.created_at,
        "updatedAt": listing.updated_at
    }


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_listing(
    listing_data: ListingCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new listing"""
    # Check if user is a landlord
    if not current_user.is_landlord:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only landlords can create listings"
        )

    # Create listing
    listing = Listing(
        owner_id=str(current_user.id),
        **listing_data.dict(by_alias=True)
    )

    await listing.insert()

    return {
        "message": "Listing created successfully",
        "listing_id": str(listing.id)
    }


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
    max_tenants: Optional[int] = None
):
    """Get all listings with optional filtering, search, and sorting.

    room_type, building_type and rent_for accept repeated params and
    match listings containing ANY of the given values.
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

    # Determine sort order
    sort_field = "-createdAt"  # Default: newest first
    if sort == "price_asc":
        sort_field = "+price"
    elif sort == "price_desc":
        sort_field = "-price"
    elif sort == "oldest":
        sort_field = "+createdAt"

    listings = await Listing.find(query).sort(sort_field).skip(skip).limit(limit).to_list()

    return [listing_to_dict(listing) for listing in listings]


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
async def import_scraped_listing(listing_data: ScrapedListingImport):
    """
    Import a scraped listing from external sources (OLX, Otodom, etc.)
    No authentication required - these are reference listings.
    Users can click through to the original source.
    """
    from app.models.listing import RoomTypeEnum, BuildingTypeEnum, RentForEnum

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

    # Create listing with scraped flag
    listing = Listing(
        owner_id="scraped",  # Special owner ID for scraped listings
        address=listing_data.address,
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
        # Scraped-specific fields
        is_scraped=True,
        source_url=listing_data.sourceUrl,
        source_site=listing_data.sourceSite,
        phone=listing_data.phone,
    )

    await listing.insert()

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
    """Get listing by ID"""
    listing = await Listing.get(listing_id)

    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )

    return listing_to_dict(listing)


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

    listing.updated_at = datetime.utcnow()
    await listing.save()

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
