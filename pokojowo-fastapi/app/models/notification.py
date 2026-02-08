"""
Notification model for storing user notifications.
"""

from beanie import Document, Indexed
from pydantic import Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum


class NotificationTypeEnum(str, Enum):
    """Types of notifications."""
    NEW_LIKE = "new_like"
    MUTUAL_MATCH = "mutual_match"
    NEW_MESSAGE = "new_message"
    SYSTEM = "system"


class Notification(Document):
    """
    Stores notifications for users so they can be retrieved
    even if they missed the real-time socket notification.
    """
    user_id: Indexed(str) = Field(..., alias="userId")
    type: NotificationTypeEnum = Field(...)
    title: str = Field(...)
    message: str = Field(...)
    data: Optional[Dict[str, Any]] = Field(default=None)  # Additional data (user info, etc.)
    is_read: bool = Field(default=False, alias="isRead")
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    read_at: Optional[datetime] = Field(default=None, alias="readAt")

    class Settings:
        name = "notifications"
        use_state_management = True
        indexes = [
            [("userId", 1), ("createdAt", -1)],  # For fetching user's notifications
            [("userId", 1), ("isRead", 1)],  # For counting unread
            [("createdAt", 1)],  # For TTL/cleanup
        ]

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "userId": "507f1f77bcf86cd799439011",
                "type": "mutual_match",
                "title": "You're Connected!",
                "message": "You and John are both interested!",
                "data": {
                    "matchedUserId": "507f1f77bcf86cd799439012",
                    "matchedUserName": "John Doe",
                    "matchedUserPhoto": None
                },
                "isRead": False,
                "createdAt": "2024-01-15T10:30:00Z"
            }
        }
