from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.chat_schema import ChatCreate, ChatResponse
from app.models.chat import Chat
from app.models.user import User
from app.core.dependencies import get_current_user
from typing import List
from datetime import datetime

router = APIRouter()


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_chat(
    chat_data: ChatCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new chat room"""
    # Ensure current user is in participants
    if str(current_user.id) not in chat_data.participants:
        chat_data.participants.append(str(current_user.id))

    # Check if chat already exists between these participants
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
            "updatedAt": existing_chat.updated_at
        }

    # Create new chat
    chat = Chat(
        participants=chat_data.participants,
        messages=[],
        last_message=None
    )

    await chat.insert()

    return {
        "message": "Chat created successfully",
        "chat_id": str(chat.id),
        "_id": str(chat.id),
        "participants": chat.participants,
        "messages": chat.messages,
        "lastMessage": chat.last_message,
        "updatedAt": chat.updated_at
    }


@router.get("/", response_model=List[dict])
async def get_user_chats(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user)
):
    """Get all chats for current user"""
    from app.models.message import Message

    chats = await Chat.find(
        {"participants": str(current_user.id)}
    ).skip(skip).limit(limit).to_list()

    result = []
    for chat in chats:
        # Find the other user (not current user)
        other_user_id = next(
            (p for p in chat.participants if p != str(current_user.id)),
            None
        )

        other_user = None
        if other_user_id:
            user = await User.get(other_user_id)
            if user:
                other_user = {
                    "_id": str(user.id),
                    "id": str(user.id),
                    "firstname": user.firstname,
                    "lastname": user.lastname,
                    "photo": user.photo,
                    "isOnline": getattr(user, 'is_online', False)
                }

        # Get last message details
        last_message_data = None
        if chat.last_message:
            last_msg = await Message.get(chat.last_message)
            if last_msg:
                last_message_data = {
                    "_id": str(last_msg.id),
                    "content": last_msg.content,
                    "sender": last_msg.sender,
                    "createdAt": last_msg.created_at.isoformat() if last_msg.created_at else None
                }

        result.append({
            "_id": str(chat.id),
            "id": str(chat.id),
            "participants": chat.participants,
            "otherUser": other_user,
            "lastMessage": last_message_data,
            "updatedAt": chat.updated_at.isoformat() if chat.updated_at else None
        })

    return result


@router.get("/{chat_id}", response_model=dict)
async def get_chat_by_id(
    chat_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get chat by ID"""
    chat = await Chat.get(chat_id)

    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )

    # Check if user is a participant
    if str(current_user.id) not in chat.participants:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this chat"
        )

    # Get other user details
    other_user_id = next(
        (p for p in chat.participants if p != str(current_user.id)),
        None
    )

    other_user = None
    if other_user_id:
        user = await User.get(other_user_id)
        if user:
            other_user = {
                "_id": str(user.id),
                "id": str(user.id),
                "firstname": user.firstname,
                "lastname": user.lastname,
                "photo": user.photo,
                "isOnline": getattr(user, 'is_online', False)
            }

    return {
        "_id": str(chat.id),
        "id": str(chat.id),
        "participants": chat.participants,
        "otherUser": other_user,
        "messages": chat.messages,
        "lastMessage": chat.last_message,
        "updatedAt": chat.updated_at.isoformat() if chat.updated_at else None
    }


@router.delete("/{chat_id}")
async def delete_chat(
    chat_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a chat"""
    chat = await Chat.get(chat_id)

    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )

    # Check if user is a participant
    if str(current_user.id) not in chat.participants:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this chat"
        )

    # Delete all messages in the chat
    from app.models.message import Message
    for message_id in chat.messages:
        message = await Message.get(message_id)
        if message:
            await message.delete()

    await chat.delete()

    return {"message": "Chat deleted successfully"}


@router.get("/with/{user_id}", response_model=dict)
async def get_chat_with_user(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get or create chat with specific user"""
    # Check if user exists
    user = await User.get(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prepare other user info
    other_user = {
        "_id": str(user.id),
        "id": str(user.id),
        "firstname": user.firstname,
        "lastname": user.lastname,
        "photo": user.photo,
        "isOnline": getattr(user, 'is_online', False)
    }

    # Find existing chat
    participants = sorted([str(current_user.id), user_id])
    chat = await Chat.find_one({
        "participants": {"$all": participants, "$size": 2}
    })

    if chat:
        return {
            "_id": str(chat.id),
            "id": str(chat.id),
            "participants": chat.participants,
            "otherUser": other_user,
            "messages": chat.messages,
            "lastMessage": chat.last_message,
            "updatedAt": chat.updated_at.isoformat() if chat.updated_at else None
        }

    # Create new chat
    new_chat = Chat(
        participants=participants,
        messages=[],
        last_message=None
    )
    await new_chat.insert()

    return {
        "_id": str(new_chat.id),
        "id": str(new_chat.id),
        "participants": new_chat.participants,
        "otherUser": other_user,
        "messages": new_chat.messages,
        "lastMessage": new_chat.last_message,
        "updatedAt": new_chat.updated_at.isoformat() if new_chat.updated_at else None
    }
