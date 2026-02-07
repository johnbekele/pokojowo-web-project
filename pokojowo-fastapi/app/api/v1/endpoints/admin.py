"""
Admin API endpoints for administrative tasks.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.models.user import User, RoleEnum
from app.core.dependencies import get_current_user
from app.services.seeding_service import seeding_service

router = APIRouter()


@router.post("/seed-listings", response_model=dict)
async def seed_listings(
    clear_existing: bool = Query(
        False,
        description="If true, delete existing listings for this owner before seeding"
    ),
    current_user: User = Depends(get_current_user)
):
    """
    Seed listings from JSON file.

    Creates sample listings from the seed data file.
    Only available to Admin or Landlord users.

    The seeded listings will be owned by the current user.
    """
    # Check permissions
    has_permission = (
        current_user.has_role(RoleEnum.ADMIN) or
        current_user.has_role(RoleEnum.LANDLORD)
    )

    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or Landlord role required to seed listings"
        )

    result = await seeding_service.seed_listings(
        owner_id=str(current_user.id),
        clear_existing=clear_existing
    )

    if not result.get("success", False) and "error" in result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result["error"]
        )

    return result


@router.get("/seed-stats", response_model=dict)
async def get_seed_stats(
    current_user: User = Depends(get_current_user)
):
    """
    Get statistics about available seed data.

    Returns information about what seed data is available
    without actually seeding anything.
    """
    # Check permissions
    has_permission = (
        current_user.has_role(RoleEnum.ADMIN) or
        current_user.has_role(RoleEnum.LANDLORD)
    )

    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or Landlord role required"
        )

    return await seeding_service.get_seed_stats()


@router.get("/system-stats", response_model=dict)
async def get_system_stats(
    current_user: User = Depends(get_current_user)
):
    """
    Get system statistics.

    Returns counts of users, listings, chats, etc.
    Only available to Admin users.
    """
    if not current_user.has_role(RoleEnum.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required"
        )

    from app.models.listing import Listing
    from app.models.chat import Chat
    from app.models.message import Message

    # Get counts
    total_users = await User.count()
    total_listings = await Listing.count()
    total_chats = await Chat.count()
    total_messages = await Message.count()

    # Get users by role
    tenants = await User.find({"role": RoleEnum.TENANT}).count()
    landlords = await User.find({"role": RoleEnum.LANDLORD}).count()
    admins = await User.find({"role": RoleEnum.ADMIN}).count()

    # Get completed profiles
    completed_profiles = await User.find({"is_profile_complete": True}).count()

    return {
        "users": {
            "total": total_users,
            "tenants": tenants,
            "landlords": landlords,
            "admins": admins,
            "completed_profiles": completed_profiles,
        },
        "listings": {
            "total": total_listings,
        },
        "chat": {
            "total_chats": total_chats,
            "total_messages": total_messages,
        },
    }
