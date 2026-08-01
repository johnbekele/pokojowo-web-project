from beanie import Document
from pydantic import Field
from typing import Dict, List, Optional
from datetime import datetime


class Chat(Document):
    participants: List[str]
    messages: List[str] = []
    last_message: Optional[str] = Field(None, alias="lastMessage")
    # Participant ID -> when they last read this chat. Absent means the chat
    # predates read tracking; chat_service seeds a cursor rather than reporting
    # every message ever sent as unread.
    last_read: Dict[str, datetime] = Field(default_factory=dict, alias="lastRead")
    updated_at: datetime = Field(default_factory=datetime.utcnow, alias="updatedAt")

    class Settings:
        name = "chats"
        use_state_management = True

    class Config:
        populate_by_name = True
