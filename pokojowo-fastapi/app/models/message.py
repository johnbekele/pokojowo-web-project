from beanie import Document
from pydantic import Field
from datetime import datetime
from typing import Optional


class Message(Document):
    content: str
    sender: str  # User ID reference
    room_id: str = Field(..., alias="roomId")  # Chat ID reference
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")

    # Reply support
    reply_to: Optional[str] = Field(None, alias="replyTo")  # Message ID being replied to

    # Soft delete
    is_deleted: bool = Field(False, alias="isDeleted")
    deleted_at: Optional[datetime] = Field(None, alias="deletedAt")

    class Settings:
        name = "messages"
        use_state_management = True

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "content": "Hello, is this room still available?",
                "sender": "507f1f77bcf86cd799439011",
                "roomId": "507f1f77bcf86cd799439012"
            }
        }
