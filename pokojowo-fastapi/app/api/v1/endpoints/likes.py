"""
Likes API endpoints for managing the mutual matching system.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional
from datetime import datetime
from app.models.user import User
from app.models.like import Like, LikeStatusEnum
from app.models.pass_model import Pass
from app.core.dependencies import get_current_user, require_verified
from app.services.likes_service import likes_service
from app.services.matching_service import matching_service
from app.services import matching_cache

router = APIRouter()


# NOTE: /{user_id}/pass routes must be declared BEFORE the bare
# /{user_id} routes or FastAPI matches the latter first.

@router.post("/{user_id}/pass", response_model=dict)
async def pass_user(
    user_id: str,
    current_user: User = Depends(require_verified)
):
    """Record a left-swipe. The passed user disappears from the deck
    for 30 days (TTL on the pass document), then reappears."""
    if str(current_user.id) == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot pass yourself"
        )

    target_user = await User.get(user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Upsert: repeat passes refresh the cooldown instead of erroring
    collection = Pass.get_motor_collection()
    await collection.update_one(
        {"passerId": str(current_user.id), "passedUserId": user_id},
        {"$set": {"createdAt": datetime.utcnow()}},
        upsert=True,
    )

    # A pass overrides an outstanding (pending) like from me to them
    await Like.find({
        "likerId": str(current_user.id),
        "likedUserId": user_id,
        "status": LikeStatusEnum.PENDING,
    }).delete()

    matching_cache.invalidate(str(current_user.id))

    return {"status": "passed", "user_id": user_id}


@router.delete("/{user_id}/pass", response_model=dict)
async def undo_pass(
    user_id: str,
    current_user: User = Depends(require_verified)
):
    """Undo a left-swipe so the user re-enters the deck immediately."""
    result = await Pass.find({
        "passerId": str(current_user.id),
        "passedUserId": user_id,
    }).delete()

    matching_cache.invalidate(str(current_user.id))

    return {
        "status": "unpassed" if result.deleted_count else "not_passed",
        "user_id": user_id,
    }


@router.post("/{user_id}", response_model=dict)
async def like_user(
    user_id: str,
    current_user: User = Depends(require_verified)
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

    from app.core.blocking import is_blocked_between
    if is_blocked_between(current_user, target_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot like this user"
        )

    # Calculate compatibility score for storage (deal-breakers apply)
    compatibility_score = None
    if current_user.is_profile_complete and target_user.is_profile_complete:
        score, _, _, rejection = matching_service.score_pair(current_user, target_user)
        if rejection is None and score is not None:
            compatibility_score = round(score, 1)

    # Liking overrides any earlier pass on the same user
    await Pass.find({
        "passerId": str(current_user.id),
        "passedUserId": user_id,
    }).delete()

    result = await likes_service.like_user(
        liker_id=str(current_user.id),
        liked_user_id=user_id,
        compatibility_score=compatibility_score
    )

    # Both decks change: mine (pending-like exclusion) and, on a mutual
    # match, theirs too
    matching_cache.invalidate(str(current_user.id))
    matching_cache.invalidate(user_id)

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
