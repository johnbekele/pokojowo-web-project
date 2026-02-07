"""
SavedMatch model for bookmarking/favoriting potential flatmates.
"""

from beanie import Document, Indexed
from pydantic import Field
from typing import Optional
from datetime import datetime


class SavedMatch(Document):
    """
    Represents a saved/bookmarked match.
    Users can save profiles they're interested in for later.
    """
    user_id: Indexed(str) = Field(..., alias="userId")
    saved_user_id: Indexed(str) = Field(..., alias="savedUserId")
    saved_at: datetime = Field(default_factory=datetime.utcnow, alias="savedAt")
    notes: Optional[str] = None

    class Settings:
        name = "saved_matches"
        use_state_management = True
        indexes = [
            [("userId", 1), ("savedUserId", 1)],  # Compound unique index
        ]

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "userId": "507f1f77bcf86cd799439011",
                "savedUserId": "507f1f77bcf86cd799439012",
                "savedAt": "2024-01-15T10:30:00Z",
                "notes": "Great match! Similar interests"
            }
        }
