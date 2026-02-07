"""
Like model for the mutual matching system.
"""

from beanie import Document, Indexed
from pydantic import Field
from typing import Optional
from datetime import datetime
from enum import Enum


class LikeStatusEnum(str, Enum):
    """Status of a like."""
    PENDING = "pending"      # Waiting for reciprocation
    MUTUAL = "mutual"        # Both users liked each other
    DECLINED = "declined"    # Other user declined


class Like(Document):
    """
    Represents a 'like' from one user to another.
    When both users like each other, it creates a mutual match.
    """
    liker_id: Indexed(str) = Field(..., alias="likerId")
    liked_user_id: Indexed(str) = Field(..., alias="likedUserId")
    status: LikeStatusEnum = Field(LikeStatusEnum.PENDING)
    liked_at: datetime = Field(default_factory=datetime.utcnow, alias="likedAt")
    compatibility_score: Optional[float] = Field(None, alias="compatibilityScore")

    class Settings:
        name = "likes"
        use_state_management = True
        indexes = [
            [("likerId", 1), ("likedUserId", 1)],  # Compound unique index
            [("likedUserId", 1)],  # For finding who liked a user
            [("status", 1)],  # For filtering by status
        ]

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "likerId": "507f1f77bcf86cd799439011",
                "likedUserId": "507f1f77bcf86cd799439012",
                "status": "pending",
                "likedAt": "2024-01-15T10:30:00Z",
                "compatibilityScore": 85.5
            }
        }
