from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class ChatCreate(BaseModel):
    participants: List[str]


class ChatResponse(BaseModel):
    id: str = Field(..., alias="_id")
    participants: List[str]
    messages: List[str] = []
    last_message: Optional[str] = Field(None, alias="lastMessage")
    updated_at: datetime = Field(..., alias="updatedAt")

    class Config:
        populate_by_name = True
