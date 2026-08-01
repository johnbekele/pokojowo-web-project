from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional

from app.schemas.message_schema import MessageCreate
from app.models.message import Message
from app.models.chat import Chat
from app.core.dependencies import get_current_user, require_verified, TokenUser
from app.services import chat_service

router = APIRouter()


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_message(
    message_data: MessageCreate,
    current_user: TokenUser = Depends(require_verified),
):
    try:
        message, _ = await chat_service.create_message_in_chat(
            chat_id=message_data.room_id,
            sender_id=current_user.id,
            content=message_data.content,
            reply_to=message_data.reply_to,
        )
    except ValueError as e:
        code = str(e)
        if code == "CHAT_NOT_FOUND":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat room not found")
        if code == "NOT_PARTICIPANT":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a participant in this chat")
        if code == "BLOCKED":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot message this user")
        raise

    return {
        "message": "Message sent successfully",
        "message_id": str(message.id),
        "_id": str(message.id),
        "content": message.content,
        "sender": message.sender,
        "roomId": message.room_id,
        "createdAt": message.created_at,
    }


@router.get("/room/{room_id}", response_model=dict)
async def get_messages_by_room(
    room_id: str,
    limit: int = chat_service.DEFAULT_PAGE_SIZE,
    before: Optional[str] = None,
    skip: int = 0,
    current_user: TokenUser = Depends(get_current_user),
):
    """Newest page of a conversation, oldest-first. Page back with `before`.

    Returns {messages, hasMore, nextBefore}; this used to be a bare array.
    """
    chat = await Chat.get(room_id)
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat room not found")
    if current_user.id not in chat.participants:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a participant in this chat")

    return await chat_service.load_message_page(
        room_id=room_id, limit=limit, before=before, skip=skip
    )


@router.get("/{message_id}", response_model=dict)
async def get_message_by_id(message_id: str, current_user: TokenUser = Depends(get_current_user)):
    message = await Message.get(message_id)
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    chat = await Chat.get(message.room_id)
    if not chat or current_user.id not in chat.participants:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a participant in this chat")

    return {
        "_id": str(message.id),
        "content": message.content,
        "sender": message.sender,
        "roomId": message.room_id,
        "createdAt": message.created_at,
    }


@router.delete("/{message_id}")
async def delete_message(message_id: str, current_user: TokenUser = Depends(get_current_user)):
    try:
        await chat_service.soft_delete_message(message_id, current_user.id)
    except ValueError as e:
        code = str(e)
        if code == "MESSAGE_NOT_FOUND":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
        if code == "NOT_SENDER":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own messages")
        raise

    return {"message": "Message deleted successfully", "messageId": message_id}
