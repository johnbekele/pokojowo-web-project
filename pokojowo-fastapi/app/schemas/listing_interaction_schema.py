"""
Pydantic schemas for listing interaction API endpoints.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict


class InterestedUserResponse(BaseModel):
    """A user interested in a listing with compatibility info."""
    user_id: str = Field(..., alias="userId", description="User ID")
    firstname: Optional[str] = Field(None, description="User's first name")
    photo_url: Optional[str] = Field(None, alias="photoUrl", description="Profile photo URL")
    compatibility_score: float = Field(..., alias="compatibilityScore", description="Compatibility score (0-100)")
    is_online: bool = Field(False, alias="isOnline", description="Whether user is currently online")

    class Config:
        populate_by_name = True


class ListingInterestedUsersResponse(BaseModel):
    """Response for getting interested users for a single listing."""
    listing_id: str = Field(..., alias="listingId", description="Listing ID")
    interested_users: List[InterestedUserResponse] = Field(..., alias="interestedUsers", description="List of compatible interested users")
    total_count: int = Field(..., alias="totalCount", description="Total number of compatible interested users")

    class Config:
        populate_by_name = True


class BatchInterestedUsersRequest(BaseModel):
    """Request for batch getting interested users for multiple listings."""
    listing_ids: List[str] = Field(..., alias="listingIds", description="List of listing IDs")
    min_compatibility: float = Field(70.0, alias="minCompatibility", ge=0, le=100, description="Minimum compatibility threshold")
    limit_per_listing: int = Field(3, alias="limitPerListing", ge=1, le=10, description="Max users per listing")

    class Config:
        populate_by_name = True


class BatchInterestedUsersResponse(BaseModel):
    """Response for batch getting interested users."""
    results: Dict[str, List[InterestedUserResponse]] = Field(..., description="Map of listing ID to interested users")

    class Config:
        populate_by_name = True


class UserInteractionsResponse(BaseModel):
    """Response for getting user's interactions with a listing."""
    has_viewed: bool = Field(..., alias="hasViewed", description="Whether user has viewed the listing")
    has_liked: bool = Field(..., alias="hasLiked", description="Whether user has liked the listing")
    has_inquired: bool = Field(..., alias="hasInquired", description="Whether user has contacted landlord")

    class Config:
        populate_by_name = True


class TrackViewRequest(BaseModel):
    """Request for tracking a view interaction."""
    duration_seconds: Optional[int] = Field(None, alias="durationSeconds", ge=0, description="View duration in seconds")

    class Config:
        populate_by_name = True


class ListingStatsResponse(BaseModel):
    """Statistics about listing interactions."""
    total_views: int = Field(..., alias="totalViews", description="Total number of views")
    unique_viewers: int = Field(..., alias="uniqueViewers", description="Number of unique viewers")
    total_likes: int = Field(..., alias="totalLikes", description="Number of likes")
    total_inquiries: int = Field(..., alias="totalInquiries", description="Number of landlord contacts")

    class Config:
        populate_by_name = True


class InteractionSuccessResponse(BaseModel):
    """Generic success response for interaction operations."""
    success: bool = Field(..., description="Whether the operation succeeded")
    message: str = Field(..., description="Status message")
