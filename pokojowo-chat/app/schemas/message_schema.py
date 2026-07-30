from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class MessageCreate(BaseModel):
    content: str
    room_id: str = Field(..., alias="roomId")
    reply_to: Optional[str] = Field(None, alias="replyTo")

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
