"""
Saved-searches API — persistence + CRUD for a user's listing-search filters.

Route ordering: static routes (GET / , POST /) are declared before the
dynamic /{search_id} routes. Raw-dict Mongo queries use camelCase aliases
(userId) because Beanie stores documents under the alias names.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from datetime import datetime

from app.models.user import User
from app.models.saved_search import SavedSearch
from app.schemas.saved_search_schema import (
    SavedSearchCreate,
    SavedSearchUpdate,
    SavedSearchResponse,
)
from app.core.dependencies import get_current_user
from app.core.locations import canonical_city

router = APIRouter()

SAVED_SEARCH_LIMIT = 20


def saved_search_to_dict(s: SavedSearch) -> dict:
    """Serialize a SavedSearch document to the camelCase API response shape."""
    return {
        "id": str(s.id),
        "userId": s.user_id,
        "name": s.name,
        "search": s.search,
        "city": s.city,
        "districts": s.districts,
        "minPrice": s.min_price,
        "maxPrice": s.max_price,
        "minSize": s.min_size,
        "maxSize": s.max_size,
        "roomTypes": s.room_types,
        "buildingTypes": s.building_types,
        "rentFor": s.rent_for,
        "maxTenants": s.max_tenants,
        "offeredBy": s.offered_by,
        "notifyEnabled": s.notify_enabled,
        "createdAt": s.created_at,
        "lastNotifiedAt": s.last_notified_at,
    }


async def _get_owned_search(search_id: str, current_user: User) -> SavedSearch:
    """Fetch a search by id, 404 if missing or not owned by current_user."""
    search = await SavedSearch.get(search_id)
    if not search or search.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved search not found",
        )
    return search


# ---- Static routes (must precede /{search_id}) ----


@router.get("/", response_model=List[SavedSearchResponse])
async def list_saved_searches(current_user: User = Depends(get_current_user)):
    """List the current user's saved searches, newest first."""
    searches = (
        await SavedSearch.find({"userId": str(current_user.id)})
        .sort("-createdAt")
        .to_list()
    )
    return [saved_search_to_dict(s) for s in searches]


@router.post("/", response_model=SavedSearchResponse, status_code=status.HTTP_201_CREATED)
async def create_saved_search(
    payload: SavedSearchCreate,
    current_user: User = Depends(get_current_user),
):
    """Create a saved search. Rejects once the user hits the per-user limit."""
    existing = await SavedSearch.find({"userId": str(current_user.id)}).count()
    if existing >= SAVED_SEARCH_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Saved search limit reached ({SAVED_SEARCH_LIMIT})",
        )

    city = canonical_city(payload.city) if payload.city else None

    search = SavedSearch(
        user_id=str(current_user.id),
        name=payload.name,
        search=payload.search,
        city=city,
        districts=payload.districts,
        min_price=payload.min_price,
        max_price=payload.max_price,
        min_size=payload.min_size,
        max_size=payload.max_size,
        room_types=payload.room_types,
        building_types=payload.building_types,
        rent_for=payload.rent_for,
        max_tenants=payload.max_tenants,
        offered_by=payload.offered_by,
        notify_enabled=payload.notify_enabled,
    )
    await search.insert()
    return saved_search_to_dict(search)


# ---- Dynamic routes ----


@router.get("/{search_id}", response_model=SavedSearchResponse)
async def get_saved_search(
    search_id: str,
    current_user: User = Depends(get_current_user),
):
    """Fetch one saved search by id (owner only)."""
    search = await _get_owned_search(search_id, current_user)
    return saved_search_to_dict(search)


@router.patch("/{search_id}", response_model=SavedSearchResponse)
async def update_saved_search(
    search_id: str,
    payload: SavedSearchUpdate,
    current_user: User = Depends(get_current_user),
):
    """Update name/notifyEnabled only (filter edits are delete+resave)."""
    search = await _get_owned_search(search_id, current_user)
    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates:
        search.name = updates["name"]
    if "notify_enabled" in updates:
        search.notify_enabled = updates["notify_enabled"]
    await search.save()
    return saved_search_to_dict(search)


@router.delete("/{search_id}", response_model=dict)
async def delete_saved_search(
    search_id: str,
    current_user: User = Depends(get_current_user),
):
    """Delete a saved search (owner only)."""
    search = await _get_owned_search(search_id, current_user)
    await search.delete()
    return {"message": "Saved search deleted"}
