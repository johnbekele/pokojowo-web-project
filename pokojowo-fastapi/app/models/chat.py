from beanie import Document
from pydantic import Field
from typing import List, Optional
from datetime import datetime


class Chat(Document):
    participants: List[str]  # List of User IDs
    messages: List[str] = []  # List of Message IDs
    last_message: Optional[str] = Field(None, alias="lastMessage")  # Message ID reference
    updated_at: datetime = Field(default_factory=datetime.utcnow, alias="updatedAt")

    class Settings:
        name = "chats"
        use_state_management = True

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "participants": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
                "messages": [],
                "lastMessage": None
            }
        }
