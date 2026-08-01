from fastapi import APIRouter, HTTPException, status, Depends
from typing import List

from app.schemas.chat_schema import ChatCreate
from app.models.chat import Chat
from app.models.message import Message
from app.core.dependencies import get_current_user, require_verified, TokenUser
from app.services import chat_service, user_client

router = APIRouter()


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_chat(chat_data: ChatCreate, current_user: TokenUser = Depends(require_verified)):
    if current_user.id not in chat_data.participants:
        chat_data.participants.append(current_user.id)

    for pid in chat_data.participants:
        if pid == current_user.id:
            continue
        if await user_client.is_blocked_between(current_user.id, pid):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot chat with this user")

    existing_chat = await Chat.find_one({
        "participants": {"$all": chat_data.participants, "$size": len(chat_data.participants)}
    })
    if existing_chat:
        return {
            "message": "Chat already exists",
            "chat_id": str(existing_chat.id),
            "_id": str(existing_chat.id),
            "participants": existing_chat.participants,
            "messages": existing_chat.messages,
            "lastMessage": existing_chat.last_message,
            "updatedAt": existing_chat.updated_at,
        }

    chat = chat_service.new_chat_document(chat_data.participants)
    await chat.insert()
    return {
        "message": "Chat created successfully",
        "chat_id": str(chat.id),
        "_id": str(chat.id),
        "participants": chat.participants,
        "messages": chat.messages,
        "lastMessage": chat.last_message,
        "updatedAt": chat.updated_at,
    }


@router.get("/", response_model=List[dict])
async def get_user_chats(
    skip: int = 0,
    limit: int = 20,
    current_user: TokenUser = Depends(get_current_user),
):
    chats = await Chat.find({"participants": current_user.id}).skip(skip).limit(limit).to_list()
    return [await chat_service.enrich_chat_list_item(chat, current_user.id) for chat in chats]


@router.get("/{chat_id}", response_model=dict)
async def get_chat_by_id(chat_id: str, current_user: TokenUser = Depends(get_current_user)):
    chat = await Chat.get(chat_id)
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    if current_user.id not in chat.participants:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a participant in this chat")
    return await chat_service.enrich_chat_detail(chat, current_user.id)


@router.post("/{chat_id}/read", response_model=dict)
async def mark_chat_read(chat_id: str, current_user: TokenUser = Depends(get_current_user)):
    """Clear the caller's unread count for this chat."""
    chat = await Chat.get(chat_id)
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    if current_user.id not in chat.participants:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a participant in this chat")

    read_at = await chat_service.mark_chat_read(chat, current_user.id)
    return {"chatId": chat_id, "readAt": read_at.isoformat(), "unreadCount": 0}


@router.delete("/{chat_id}")
async def delete_chat(chat_id: str, current_user: TokenUser = Depends(get_current_user)):
    chat = await Chat.get(chat_id)
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    if current_user.id not in chat.participants:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a participant in this chat")

    for message_id in chat.messages:
        message = await Message.get(message_id)
        if message:
            await message.delete()
    await chat.delete()
    return {"message": "Chat deleted successfully"}


@router.get("/with/{user_id}", response_model=dict)
async def get_chat_with_user(user_id: str, current_user: TokenUser = Depends(get_current_user)):
    profiles = await user_client.get_users_batch([user_id])
    profile = profiles.get(user_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if await user_client.is_blocked_between(current_user.id, user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot chat with this user")

    other_user = await chat_service.format_other_user(profile)
    participants = sorted([current_user.id, user_id])
    chat = await Chat.find_one({"participants": {"$all": participants, "$size": 2}})

    if chat:
        return await chat_service.enrich_chat_detail(chat, current_user.id)

    new_chat = chat_service.new_chat_document(participants)
    await new_chat.insert()
    return {
        "_id": str(new_chat.id),
        "id": str(new_chat.id),
        "participants": new_chat.participants,
        "otherUser": other_user,
        "messages": new_chat.messages,
        "lastMessage": new_chat.last_message,
        "unreadCount": 0,
        "updatedAt": new_chat.updated_at.isoformat() if new_chat.updated_at else None,
    }
