from beanie import Document
from pydantic import Field
from typing import List, Optional
from datetime import datetime


class Chat(Document):
    participants: List[str]
    messages: List[str] = []
    last_message: Optional[str] = Field(None, alias="lastMessage")
    updated_at: datetime = Field(default_factory=datetime.utcnow, alias="updatedAt")

    class Settings:
        name = "chats"
        use_state_management = True

    class Config:
        populate_by_name = True
