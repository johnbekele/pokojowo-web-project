from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.schemas.listing_schema import ListingCreate, ListingUpdate, ListingResponse
from app.models.listing import Listing
from app.models.user import User
from app.core.dependencies import get_current_user
from typing import List, Optional
from datetime import datetime

router = APIRouter()


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
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    room_type: Optional[str] = None,
    building_type: Optional[str] = None
):
    """Get all listings with optional filtering"""
    query = {}

    if min_price is not None:
        query["price"] = {"$gte": min_price}

    if max_price is not None:
        if "price" in query:
            query["price"]["$lte"] = max_price
        else:
            query["price"] = {"$lte": max_price}

    if room_type:
        query["room_type"] = room_type

    if building_type:
        query["building_type"] = building_type

    listings = await Listing.find(query).skip(skip).limit(limit).to_list()

    return [
        {
            "_id": str(listing.id),
            "ownerId": listing.owner_id,
            "address": listing.address,
            "price": listing.price,
            "size": listing.size,
            "maxTenants": listing.max_tenants,
            "images": listing.images,
            "description": listing.description,
            "availableFrom": listing.available_from,
            "roomType": listing.room_type.value,
            "buildingType": listing.building_type.value,
            "rentForOnly": [r.value for r in listing.rent_for_only],
            "canBeContacted": listing.can_be_contacted,
            "closeTo": listing.close_to,
            "AIHelp": listing.ai_help,
            "createdAt": listing.created_at,
            "updatedAt": listing.updated_at
        }
        for listing in listings
    ]


@router.get("/{listing_id}", response_model=dict)
async def get_listing_by_id(listing_id: str):
    """Get listing by ID"""
    listing = await Listing.get(listing_id)

    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )

    return {
        "_id": str(listing.id),
        "ownerId": listing.owner_id,
        "address": listing.address,
        "price": listing.price,
        "size": listing.size,
        "maxTenants": listing.max_tenants,
        "images": listing.images,
        "description": listing.description,
        "availableFrom": listing.available_from,
        "roomType": listing.room_type.value,
        "buildingType": listing.building_type.value,
        "rentForOnly": [r.value for r in listing.rent_for_only],
        "canBeContacted": listing.can_be_contacted,
        "closeTo": listing.close_to,
        "AIHelp": listing.ai_help,
        "createdAt": listing.created_at,
        "updatedAt": listing.updated_at
    }


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

    listings = await Listing.find({"owner_id": str(current_user.id)}).skip(skip).limit(limit).to_list()

    return [
        {
            "_id": str(listing.id),
            "ownerId": listing.owner_id,
            "address": listing.address,
            "price": listing.price,
            "size": listing.size,
            "maxTenants": listing.max_tenants,
            "images": listing.images,
            "description": listing.description,
            "availableFrom": listing.available_from,
            "roomType": listing.room_type.value,
            "buildingType": listing.building_type.value,
            "rentForOnly": [r.value for r in listing.rent_for_only],
            "canBeContacted": listing.can_be_contacted,
            "closeTo": listing.close_to,
            "AIHelp": listing.ai_help,
            "createdAt": listing.created_at,
            "updatedAt": listing.updated_at
        }
        for listing in listings
    ]


@router.get("/owner/{owner_id}", response_model=List[dict])
async def get_listings_by_owner(owner_id: str, skip: int = 0, limit: int = 20):
    """Get all listings by owner ID"""
    listings = await Listing.find({"owner_id": owner_id}).skip(skip).limit(limit).to_list()

    return [
        {
            "_id": str(listing.id),
            "ownerId": listing.owner_id,
            "address": listing.address,
            "price": listing.price,
            "size": listing.size,
            "maxTenants": listing.max_tenants,
            "images": listing.images,
            "description": listing.description,
            "availableFrom": listing.available_from,
            "roomType": listing.room_type.value,
            "buildingType": listing.building_type.value,
            "rentForOnly": [r.value for r in listing.rent_for_only],
            "canBeContacted": listing.can_be_contacted,
            "closeTo": listing.close_to,
            "AIHelp": listing.ai_help,
            "createdAt": listing.created_at,
            "updatedAt": listing.updated_at
        }
        for listing in listings
    ]
