"""
Listing Interactions API endpoints.

Tracks user interactions with listings (views, likes, inquiries)
and provides roommate matching data for listings.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from app.models.user import User
from app.models.listing import Listing
from app.core.dependencies import get_current_user
from app.services.listing_interaction_service import listing_interaction_service
from app.services.listing_match_service import listing_match_service
from app.schemas.listing_interaction_schema import (
    InterestedUserResponse,
    ListingInterestedUsersResponse,
    BatchInterestedUsersRequest,
    BatchInterestedUsersResponse,
    UserInteractionsResponse,
    TrackViewRequest,
    ListingStatsResponse,
    InteractionSuccessResponse,
)

router = APIRouter()


@router.post("/{listing_id}/view", response_model=InteractionSuccessResponse)
async def track_view(
    listing_id: str,
    request: Optional[TrackViewRequest] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Track a view interaction when user views listing details.
    Deduplicated within 30-minute windows.
    """
    # Verify listing exists
    listing = await Listing.get(listing_id)
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )

    duration = request.duration_seconds if request else None
    await listing_interaction_service.track_view(
        user_id=str(current_user.id),
        listing_id=listing_id,
        duration_seconds=duration
    )

    return InteractionSuccessResponse(
        success=True,
        message="View tracked successfully"
    )


@router.post("/{listing_id}/like", response_model=InteractionSuccessResponse)
async def like_listing(
    listing_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Like/save a listing.
    Returns success even if already liked (idempotent).
    """
    # Verify listing exists
    listing = await Listing.get(listing_id)
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )

    result = await listing_interaction_service.track_like(
        user_id=str(current_user.id),
        listing_id=listing_id
    )

    if result is None:
        return InteractionSuccessResponse(
            success=True,
            message="Listing already liked"
        )

    return InteractionSuccessResponse(
        success=True,
        message="Listing liked successfully"
    )


@router.delete("/{listing_id}/like", response_model=InteractionSuccessResponse)
async def unlike_listing(
    listing_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Remove like from a listing.
    """
    removed = await listing_interaction_service.remove_like(
        user_id=str(current_user.id),
        listing_id=listing_id
    )

    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Like not found"
        )

    return InteractionSuccessResponse(
        success=True,
        message="Like removed successfully"
    )


@router.get("/{listing_id}/my-interactions", response_model=UserInteractionsResponse)
async def get_my_interactions(
    listing_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get current user's interactions with a listing.
    """
    interactions = await listing_interaction_service.get_user_interactions(
        user_id=str(current_user.id),
        listing_id=listing_id
    )

    return UserInteractionsResponse(
        has_viewed=interactions["hasViewed"],
        has_liked=interactions["hasLiked"],
        has_inquired=interactions["hasInquired"]
    )


@router.get("/{listing_id}/interested-users", response_model=ListingInterestedUsersResponse)
async def get_interested_users(
    listing_id: str,
    min_compatibility: float = Query(70.0, alias="minCompatibility", ge=0, le=100),
    limit: int = Query(5, ge=1, le=20),
    current_user: User = Depends(get_current_user)
):
    """
    Get compatible users who are interested in this listing.
    Only returns users with >= minCompatibility score.
    """
    # Verify listing exists
    listing = await Listing.get(listing_id)
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )

    interested_users = await listing_match_service.get_compatible_interested_users(
        listing_id=listing_id,
        current_user=current_user,
        min_compatibility=min_compatibility,
        limit=limit
    )

    return ListingInterestedUsersResponse(
        listing_id=listing_id,
        interested_users=[
            InterestedUserResponse(
                user_id=u["user_id"],
                firstname=u["firstname"],
                photo_url=u["photo_url"],
                compatibility_score=u["compatibility_score"],
                is_online=u["is_online"]
            )
            for u in interested_users
        ],
        total_count=len(interested_users)
    )


@router.post("/batch-interested-users", response_model=BatchInterestedUsersResponse)
async def batch_get_interested_users(
    request: BatchInterestedUsersRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Batch get compatible interested users for multiple listings.
    Optimized for listing grid display.
    """
    if not request.listing_ids:
        return BatchInterestedUsersResponse(results={})

    if len(request.listing_ids) > 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 50 listings per batch request"
        )

    results = await listing_match_service.get_batch_compatible_users(
        listing_ids=request.listing_ids,
        current_user=current_user,
        min_compatibility=request.min_compatibility,
        limit_per_listing=request.limit_per_listing
    )

    # Convert to response format
    formatted_results = {}
    for listing_id, users in results.items():
        formatted_results[listing_id] = [
            InterestedUserResponse(
                user_id=u["user_id"],
                firstname=u["firstname"],
                photo_url=u["photo_url"],
                compatibility_score=u["compatibility_score"],
                is_online=u["is_online"]
            )
            for u in users
        ]

    return BatchInterestedUsersResponse(results=formatted_results)


@router.get("/{listing_id}/stats", response_model=ListingStatsResponse)
async def get_listing_stats(
    listing_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get interaction statistics for a listing.
    Only accessible to listing owner or admin.
    """
    # Verify listing exists
    listing = await Listing.get(listing_id)
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )

    # Check if user is owner or admin
    is_owner = str(listing.owner_id) == str(current_user.id)
    is_admin = current_user.has_role(current_user.role[0].__class__.ADMIN) if current_user.role else False

    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only listing owner can view stats"
        )

    stats = await listing_interaction_service.get_listing_stats(listing_id)

    return ListingStatsResponse(
        total_views=stats["totalViews"],
        unique_viewers=stats["uniqueViewers"],
        total_likes=stats["totalLikes"],
        total_inquiries=stats["totalInquiries"]
    )


@router.get("/my-liked", response_model=dict)
async def get_my_liked_listings(
    current_user: User = Depends(get_current_user)
):
    """
    Get all listing IDs that the current user has liked.
    """
    liked_listing_ids = await listing_interaction_service.get_user_liked_listings(
        user_id=str(current_user.id)
    )

    return {
        "likedListingIds": liked_listing_ids,
        "count": len(liked_listing_ids)
    }
