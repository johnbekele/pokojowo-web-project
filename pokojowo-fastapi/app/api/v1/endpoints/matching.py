"""
Matching API endpoints for finding compatible flatmates.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query, BackgroundTasks
from typing import Optional, List
from app.models.user import User, RoleEnum
from app.core.dependencies import get_current_user
from app.services.matching_service import matching_service
from app.services.notification_service import notification_service
from app.services.likes_service import likes_service
from app.services.favorites_service import favorites_service
from app.schemas.matching_schema import MatchResponse, MatchResult

router = APIRouter()


@router.get("/dashboard", response_model=dict)
async def get_tenant_dashboard(
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive tenant dashboard data.

    Returns matching stats, likes stats, saved matches, and recent activity.
    """
    if not current_user.is_profile_complete:
        return {
            "profile_complete": False,
            "message": "Complete your profile to see dashboard stats"
        }

    user_id = str(current_user.id)

    # Get matching stats
    total_users = await User.find({
        "isProfileComplete": True,
        "_id": {"$ne": current_user.id}
    }).count()

    candidates = await User.find({
        "isProfileComplete": True,
        "_id": {"$ne": current_user.id}
    }).to_list(length=500)

    match_results = await matching_service.find_matches(
        user=current_user,
        candidates=candidates,
        limit=50
    )

    # Get likes stats
    likes_stats = await likes_service.get_stats(user_id)

    # Get saved count
    saved_count = await favorites_service.get_saved_count(user_id)

    # Get top matches preview (top 5)
    top_matches = match_results["matches"][:5] if match_results["matches"] else []

    # Get recent mutual matches (last 3)
    mutual_result = await likes_service.get_mutual_matches(user_id, limit=3)

    # Get pending likes (people who liked me)
    pending_result = await likes_service.get_likes_received(user_id, limit=5)
    pending_likes = [l for l in pending_result["likes"] if l["status"] == "pending"]

    # Calculate score distribution
    high_matches = len([m for m in match_results["matches"] if m["compatibility_score"] >= 80])
    medium_matches = len([m for m in match_results["matches"] if 50 <= m["compatibility_score"] < 80])

    return {
        "profile_complete": True,
        "stats": {
            "total_potential_matches": total_users,
            "compatible_matches": len(match_results["matches"]),
            "high_compatibility": high_matches,
            "medium_compatibility": medium_matches,
            "likes_sent": likes_stats["likes_sent"],
            "likes_received": likes_stats["likes_received"],
            "mutual_matches": likes_stats["mutual_matches"],
            "pending_likes": likes_stats["pending_likes"],
            "saved_matches": saved_count,
            "top_match_score": match_results["matches"][0]["compatibility_score"] if match_results["matches"] else None
        },
        "previews": {
            "top_matches": top_matches,
            "recent_mutual_matches": mutual_result["mutual_matches"],
            "pending_likes": pending_likes[:3]
        }
    }


@router.get("/", response_model=dict)
async def get_matches(
    limit: int = Query(20, ge=1, le=100, description="Maximum number of matches to return"),
    location: Optional[str] = Query(None, description="Filter by location (partial match)"),
    min_score: float = Query(0, ge=0, le=100, alias="minScore", description="Minimum compatibility score"),
    current_user: User = Depends(get_current_user)
):
    """
    Get compatible flatmate matches for the current user.

    The matching algorithm:
    1. Filters out candidates that violate deal-breakers
    2. Calculates weighted compatibility scores across 5 categories
    3. Returns ranked matches with detailed explanations

    Requires completed tenant profile.
    """
    # Verify user is a tenant
    if not current_user.has_role(RoleEnum.TENANT) and not current_user.has_role(RoleEnum.USER):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tenants can access matching"
        )

    # Check profile completion
    if not current_user.is_profile_complete:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete your profile before viewing matches"
        )

    # Build query for candidates
    # Note: Use camelCase field names as they're stored in MongoDB with aliases
    query = {
        "isProfileComplete": True,
        "_id": {"$ne": current_user.id}
    }

    # Add location filter if specified
    if location:
        query["location"] = {"$regex": location, "$options": "i"}

    # Fetch candidates (tenants with completed profiles)
    candidates = await User.find(query).to_list(length=500)

    # Run matching algorithm
    results = await matching_service.find_matches(
        user=current_user,
        candidates=candidates,
        limit=limit,
        min_score=min_score
    )

    return results


@router.get("/user/{user_id}", response_model=dict)
async def get_match_with_user(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed compatibility analysis with a specific user.

    Returns the compatibility score breakdown and explanations
    for why this user is or isn't a good match.
    """
    # Find the candidate
    candidate = await User.get(user_id)

    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Run matching for single user
    results = await matching_service.find_matches(
        user=current_user,
        candidates=[candidate],
        limit=1
    )

    if not results["matches"]:
        # Either deal-breaker triggered or profiles incomplete
        return {
            "compatible": False,
            "reason": "Incompatible due to deal-breakers or incomplete profiles",
            "user_id": user_id
        }

    match_result = results["matches"][0]
    match_result["compatible"] = True

    return match_result


@router.post("/refresh", response_model=dict)
async def refresh_matches(
    current_user: User = Depends(get_current_user)
):
    """
    Force refresh of matches for the current user.

    This endpoint can be used after profile updates to get
    recalculated compatibility scores.
    """
    if not current_user.is_profile_complete:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete your profile before refreshing matches"
        )

    # Fetch all potential candidates
    candidates = await User.find({
        "isProfileComplete": True,
        "_id": {"$ne": current_user.id}
    }).to_list(length=500)

    # Run matching algorithm
    results = await matching_service.find_matches(
        user=current_user,
        candidates=candidates,
        limit=50  # More results on refresh
    )

    return {
        "message": "Matches refreshed successfully",
        "match_count": len(results["matches"]),
        "total_candidates": results["total_candidates"],
        "filtered_by_deal_breakers": results["filtered_by_deal_breakers"],
        "matches": results["matches"]
    }


@router.post("/notify", response_model=dict)
async def send_match_notifications(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """
    Trigger email notifications for new high-quality matches.

    Sends notifications about matches with 70%+ compatibility score.
    """
    if not current_user.is_profile_complete:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete your profile before requesting notifications"
        )

    # Run notifications in background
    background_tasks.add_task(
        notification_service.notify_new_matches_for_user,
        current_user
    )

    return {
        "message": "Match notifications are being sent",
        "status": "processing"
    }


@router.get("/stats/summary", response_model=dict)
async def get_matching_stats(
    current_user: User = Depends(get_current_user)
):
    """
    Get matching statistics summary for the current user.

    Returns overview of matching activity without full match details.
    """
    if not current_user.is_profile_complete:
        return {
            "profile_complete": False,
            "message": "Complete your profile to see matching stats"
        }

    # Get quick stats
    total_users = await User.find({
        "isProfileComplete": True,
        "_id": {"$ne": current_user.id}
    }).count()

    candidates = await User.find({
        "isProfileComplete": True,
        "_id": {"$ne": current_user.id}
    }).to_list(length=500)

    results = await matching_service.find_matches(
        user=current_user,
        candidates=candidates,
        limit=100
    )

    # Calculate score distribution
    high_matches = len([m for m in results["matches"] if m["compatibility_score"] >= 80])
    medium_matches = len([m for m in results["matches"] if 50 <= m["compatibility_score"] < 80])
    low_matches = len([m for m in results["matches"] if m["compatibility_score"] < 50])

    return {
        "profile_complete": True,
        "total_potential_matches": total_users,
        "filtered_by_deal_breakers": results["filtered_by_deal_breakers"],
        "compatible_matches": len(results["matches"]),
        "score_distribution": {
            "high": high_matches,      # 80-100
            "medium": medium_matches,  # 50-79
            "low": low_matches         # 0-49
        },
        "top_match_score": results["matches"][0]["compatibility_score"] if results["matches"] else None
    }
