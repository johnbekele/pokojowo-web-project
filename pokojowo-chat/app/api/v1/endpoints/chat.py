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
    participants = list(dict.fromkeys([*chat_data.participants, current_user.id]))

    # PRODUCT_CONTEXT.md specifies one-to-one messaging, and every enrichment
    # path picks a single counterpart, so a third participant would be invisible
    # to the other two rather than raising. Group chats need their own model.
    if len(participants) != 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A chat must have exactly two participants",
        )

    others = [pid for pid in participants if pid != current_user.id]

    # Without this a chat can be created against a deleted or made-up ID,
    # leaving a conversation whose counterpart renders as null and which no
    # user-facing action can remove.
    profiles = await user_client.get_users_batch(others)
    if any(pid not in profiles for pid in others):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Participant not found",
        )

    for pid in others:
        if await user_client.is_blocked_between(current_user.id, pid):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot chat with this user")

    existing_chat = await Chat.find_one({
        "participants": {"$all": participants, "$size": len(participants)}
    })
    if existing_chat:
        return {
            "message": "Chat already exists",
            "chat_id": str(existing_chat.id),
            "_id": str(existing_chat.id),
            "participants": existing_chat.participants,
            "lastMessage": existing_chat.last_message,
            "updatedAt": existing_chat.updated_at,
        }

    chat = chat_service.new_chat_document(participants)
    await chat.insert()
    return {
        "message": "Chat created successfully",
        "chat_id": str(chat.id),
        "_id": str(chat.id),
        "participants": chat.participants,
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

    # Messages are stored in their own collection. Query by room rather than
    # relying on the legacy, unbounded Chat.messages ID array so old and new
    # conversations are deleted consistently.
    messages = await Message.find({"roomId": chat_id}).to_list()
    for message in messages:
        await message.delete()
    await chat.delete()
    return {"message": "Chat deleted successfully"}


@router.get("/with/{user_id}", response_model=dict)
async def get_chat_with_user(user_id: str, current_user: TokenUser = Depends(require_verified)):
    """Get or create the one-to-one chat with a user.

    Verified-only, matching POST / and the socket send path; this route creates
    chats too, so exempting it would leave that gate bypassable.
    """
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
        "lastMessage": new_chat.last_message,
        "unreadCount": 0,
        "updatedAt": new_chat.updated_at.isoformat() if new_chat.updated_at else None,
    }
