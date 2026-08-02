from beanie import Document
from pydantic import Field
from pymongo import ASCENDING, DESCENDING, IndexModel
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
        indexes = [
            # Serves the chat list: every participant's conversations, most
            # recently active first. Multikey on participants, which is what
            # makes the membership test an index lookup rather than a scan of
            # every conversation on the platform.
            IndexModel(
                [("participants", ASCENDING), ("updatedAt", DESCENDING)],
                name="participant_recent",
            ),
        ]

    class Config:
        populate_by_name = True
