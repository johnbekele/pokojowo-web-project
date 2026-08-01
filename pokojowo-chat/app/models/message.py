from beanie import Document
from pydantic import Field
from pymongo import ASCENDING, DESCENDING, IndexModel
from datetime import datetime
from typing import Optional


class Message(Document):
    content: str
    sender: str
    room_id: str = Field(..., alias="roomId")
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    reply_to: Optional[str] = Field(None, alias="replyTo")
    is_deleted: bool = Field(False, alias="isDeleted")
    deleted_at: Optional[datetime] = Field(None, alias="deletedAt")

    class Settings:
        name = "messages"
        use_state_management = True
        indexes = [
            # Serves newest-first paging within one conversation. _id is part of
            # the key so the tie-break sort is satisfied by the index too,
            # rather than falling back to a blocking in-memory sort.
            IndexModel(
                [("roomId", ASCENDING), ("createdAt", DESCENDING), ("_id", DESCENDING)],
                name="room_newest_first",
            ),
        ]

    class Config:
        populate_by_name = True
