"""
MutualMatch model for confirmed mutual connections.
"""

from beanie import Document, Indexed
from pydantic import Field
from typing import Optional
from datetime import datetime
from enum import Enum


class MatchStatusEnum(str, Enum):
    """Status of a mutual match."""
    ACTIVE = "active"        # Match is active
    UNMATCHED = "unmatched"  # One user unmatched


class MutualMatch(Document):
    """
    Represents a mutual match between two users.
    Created when both users have liked each other.
    """
    user_1_id: Indexed(str) = Field(..., alias="user1Id")
    user_2_id: Indexed(str) = Field(..., alias="user2Id")
    status: MatchStatusEnum = Field(MatchStatusEnum.ACTIVE)
    matched_at: datetime = Field(default_factory=datetime.utcnow, alias="matchedAt")
    compatibility_score: Optional[float] = Field(None, alias="compatibilityScore")
    unmatched_at: Optional[datetime] = Field(None, alias="unmatchedAt")
    unmatched_by: Optional[str] = Field(None, alias="unmatchedBy")

    class Settings:
        name = "mutual_matches"
        use_state_management = True
        indexes = [
            [("user1Id", 1), ("user2Id", 1)],  # Compound unique index
            [("user1Id", 1)],  # For finding matches by user1
            [("user2Id", 1)],  # For finding matches by user2
            [("status", 1)],   # For filtering active matches
        ]

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "user1Id": "507f1f77bcf86cd799439011",
                "user2Id": "507f1f77bcf86cd799439012",
                "status": "active",
                "matchedAt": "2024-01-15T10:30:00Z",
                "compatibilityScore": 85.5
            }
        }

    @classmethod
    async def find_by_user(cls, user_id: str):
        """Find all matches for a user (either as user1 or user2)."""
        return await cls.find({
            "$or": [
                {"user1Id": user_id},
                {"user2Id": user_id}
            ],
            "status": MatchStatusEnum.ACTIVE
        }).to_list()

    def get_other_user_id(self, current_user_id: str) -> str:
        """Get the ID of the other user in the match."""
        if self.user_1_id == current_user_id:
            return self.user_2_id
        return self.user_1_id
