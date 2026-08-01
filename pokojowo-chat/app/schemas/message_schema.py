from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class MessageCreate(BaseModel):
    content: str
    room_id: str = Field(..., alias="roomId")
    reply_to: Optional[str] = Field(None, alias="replyTo")
    # Client-generated ID for its optimistic bubble; echoed back so the sender
    # can correlate the result without comparing message content.
    temp_id: Optional[str] = Field(None, alias="tempId")

    class Config:
        populate_by_name = True


class MessageResponse(BaseModel):
    id: str = Field(..., alias="_id")
    content: str
    sender: str
    room_id: str = Field(..., alias="roomId")
    created_at: datetime = Field(..., alias="createdAt")
    reply_to: Optional[str] = Field(None, alias="replyTo")
    is_deleted: bool = Field(False, alias="isDeleted")

    class Config:
        populate_by_name = True
