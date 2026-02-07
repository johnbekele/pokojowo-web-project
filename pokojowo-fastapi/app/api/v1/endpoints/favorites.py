"""
Favorites API endpoints for managing saved/bookmarked matches.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional
from app.models.user import User
from app.core.dependencies import get_current_user
from app.services.favorites_service import favorites_service

router = APIRouter()


@router.get("/", response_model=dict)
async def get_saved_matches(
    limit: int = Query(50, ge=1, le=100, description="Max number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: User = Depends(get_current_user)
):
    """
    Get all saved matches for the current user.

    Returns list of saved profiles with user details.
    """
    result = await favorites_service.get_saved_matches(
        user_id=str(current_user.id),
        limit=limit,
        offset=offset
    )

    return result


@router.post("/{user_id}", response_model=dict)
async def save_match(
    user_id: str,
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Save a user to favorites.

    Cannot save yourself.
    """
    if str(current_user.id) == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot save yourself"
        )

    # Verify user exists
    target_user = await User.get(user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    result = await favorites_service.save_match(
        user_id=str(current_user.id),
        saved_user_id=user_id,
        notes=notes
    )

    return result


@router.delete("/{user_id}", response_model=dict)
async def remove_saved_match(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Remove a user from favorites.
    """
    result = await favorites_service.remove_saved(
        user_id=str(current_user.id),
        saved_user_id=user_id
    )

    if result["status"] == "not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["message"]
        )

    return result


@router.get("/check/{user_id}", response_model=dict)
async def check_if_saved(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Check if a user is saved in favorites.
    """
    is_saved = await favorites_service.is_saved(
        user_id=str(current_user.id),
        saved_user_id=user_id
    )

    return {"is_saved": is_saved}


@router.patch("/{user_id}/notes", response_model=dict)
async def update_saved_notes(
    user_id: str,
    notes: str,
    current_user: User = Depends(get_current_user)
):
    """
    Update notes for a saved match.
    """
    result = await favorites_service.update_notes(
        user_id=str(current_user.id),
        saved_user_id=user_id,
        notes=notes
    )

    if result["status"] == "not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["message"]
        )

    return result


@router.get("/count", response_model=dict)
async def get_saved_count(
    current_user: User = Depends(get_current_user)
):
    """
    Get count of saved matches.
    """
    count = await favorites_service.get_saved_count(
        user_id=str(current_user.id)
    )

    return {"count": count}
