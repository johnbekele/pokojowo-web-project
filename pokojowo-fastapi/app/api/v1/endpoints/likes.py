"""
Likes API endpoints for managing the mutual matching system.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional
from app.models.user import User
from app.core.dependencies import get_current_user
from app.services.likes_service import likes_service
from app.services.matching_service import matching_service

router = APIRouter()


@router.post("/{user_id}", response_model=dict)
async def like_user(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Like a user.

    If the other user has already liked you, this creates a mutual match.
    Returns information about whether a mutual match was created.
    """
    if str(current_user.id) == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot like yourself"
        )

    # Verify user exists and has completed profile
    target_user = await User.get(user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Calculate compatibility score for storage
    compatibility_score = None
    if current_user.is_profile_complete and target_user.is_profile_complete:
        results = await matching_service.find_matches(
            user=current_user,
            candidates=[target_user],
            limit=1
        )
        if results["matches"]:
            compatibility_score = results["matches"][0].get("compatibility_score")

    result = await likes_service.like_user(
        liker_id=str(current_user.id),
        liked_user_id=user_id,
        compatibility_score=compatibility_score
    )

    return result


@router.delete("/{user_id}", response_model=dict)
async def unlike_user(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Unlike a user (remove like).

    If there was a mutual match, it will be deactivated.
    """
    result = await likes_service.unlike_user(
        liker_id=str(current_user.id),
        liked_user_id=user_id
    )

    if result["status"] == "not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["message"]
        )

    return result


@router.get("/sent", response_model=dict)
async def get_likes_sent(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user)
):
    """
    Get likes sent by the current user.

    Returns list of users the current user has liked.
    """
    result = await likes_service.get_likes_sent(
        user_id=str(current_user.id),
        limit=limit,
        offset=offset
    )

    return result


@router.get("/received", response_model=dict)
async def get_likes_received(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user)
):
    """
    Get likes received by the current user.

    Returns list of users who have liked the current user.
    """
    result = await likes_service.get_likes_received(
        user_id=str(current_user.id),
        limit=limit,
        offset=offset
    )

    return result


@router.get("/mutual", response_model=dict)
async def get_mutual_matches(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user)
):
    """
    Get all mutual matches for the current user.

    Mutual matches occur when both users have liked each other.
    """
    result = await likes_service.get_mutual_matches(
        user_id=str(current_user.id),
        limit=limit,
        offset=offset
    )

    return result


@router.get("/check/{user_id}", response_model=dict)
async def check_like_status(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Check the like status between current user and another user.

    Returns whether each user has liked the other and if there's a mutual match.
    """
    result = await likes_service.get_like_status(
        user_id=str(current_user.id),
        other_user_id=user_id
    )

    return result


@router.post("/{user_id}/unmatch", response_model=dict)
async def unmatch_user(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Unmatch with a user.

    Removes the mutual match but keeps the likes as pending.
    """
    result = await likes_service.unmatch(
        user_id=str(current_user.id),
        other_user_id=user_id
    )

    if result["status"] == "not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["message"]
        )

    return result


@router.get("/stats", response_model=dict)
async def get_likes_stats(
    current_user: User = Depends(get_current_user)
):
    """
    Get like/match statistics for the current user.

    Returns counts of likes sent, received, and mutual matches.
    """
    result = await likes_service.get_stats(
        user_id=str(current_user.id)
    )

    return result
