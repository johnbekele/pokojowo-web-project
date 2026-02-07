"""
Listing interaction model for tracking user engagement with listings.
Tracks views, likes, and inquiries to enable roommate-listing matching.
"""

from beanie import Document, Indexed
from pydantic import Field
from typing import Optional
from datetime import datetime
from enum import Enum


class InteractionTypeEnum(str, Enum):
    """Types of interactions a user can have with a listing."""
    VIEW = "view"           # User viewed listing details (1 point)
    LIKE = "like"           # User liked/saved the listing (3 points)
    INQUIRY = "inquiry"     # User contacted landlord (5 points)


# Interest score weights for matching algorithm
INTEREST_WEIGHTS = {
    InteractionTypeEnum.VIEW: 1,
    InteractionTypeEnum.LIKE: 3,
    InteractionTypeEnum.INQUIRY: 5,
}


class ListingInteraction(Document):
    """
    Tracks user interactions with listings.
    Used to find compatible roommates interested in the same listings.
    """
    user_id: Indexed(str) = Field(..., alias="userId")
    listing_id: Indexed(str) = Field(..., alias="listingId")
    interaction_type: InteractionTypeEnum = Field(..., alias="interactionType")
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")

    # Optional metadata
    view_duration_seconds: Optional[int] = Field(None, alias="viewDurationSeconds")
    message_id: Optional[str] = Field(None, alias="messageId")  # For inquiry interactions

    class Settings:
        name = "listing_interactions"
        use_state_management = True
        indexes = [
            [("userId", 1), ("listingId", 1), ("interactionType", 1)],  # Compound index for queries
            [("listingId", 1)],  # For finding all users interested in a listing
            [("userId", 1)],  # For finding all listings a user interacted with
            [("interactionType", 1)],  # For filtering by type
        ]

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "userId": "507f1f77bcf86cd799439011",
                "listingId": "507f1f77bcf86cd799439012",
                "interactionType": "view",
                "createdAt": "2024-01-15T10:30:00Z",
                "viewDurationSeconds": 45
            }
        }
