from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.message_schema import MessageCreate, MessageResponse
from app.models.message import Message
from app.models.chat import Chat
from app.models.user import User
from app.core.dependencies import get_current_user
from typing import List
from datetime import datetime

router = APIRouter()


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new message"""
    # Verify chat exists and user is a participant
    chat = await Chat.get(message_data.room_id)

    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat room not found"
        )

    if str(current_user.id) not in chat.participants:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this chat"
        )

    # Create message
    message = Message(
        content=message_data.content,
        sender=str(current_user.id),
        room_id=message_data.room_id
    )

    await message.insert()

    # Update chat with new message
    chat.messages.append(str(message.id))
    chat.last_message = str(message.id)
    chat.updated_at = datetime.utcnow()
    await chat.save()

    return {
        "message": "Message sent successfully",
        "message_id": str(message.id),
        "_id": str(message.id),
        "content": message.content,
        "sender": message.sender,
        "roomId": message.room_id,
        "createdAt": message.created_at
    }


@router.get("/room/{room_id}", response_model=List[dict])
async def get_messages_by_room(
    room_id: str,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    """Get all messages in a chat room"""
    # Verify chat exists and user is a participant
    chat = await Chat.get(room_id)

    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat room not found"
        )

    if str(current_user.id) not in chat.participants:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this chat"
        )

    # Get messages sorted by creation time (use MongoDB field name "roomId" due to alias)
    messages = await Message.find({"roomId": room_id}).sort("createdAt").skip(skip).limit(limit).to_list()

    # Build response with reply data
    result = []
    for message in messages:
        msg_data = {
            "_id": str(message.id),
            "id": str(message.id),
            "content": message.content if not message.is_deleted else None,
            "sender": message.sender,
            "senderId": message.sender,
            "roomId": message.room_id,
            "createdAt": message.created_at.isoformat() if message.created_at else None,
            "replyTo": message.reply_to,
            "isDeleted": message.is_deleted
        }

        # If this message is a reply, include replied message data
        if message.reply_to:
            replied_msg = await Message.get(message.reply_to)
            if replied_msg:
                msg_data["replyToData"] = {
                    "_id": str(replied_msg.id),
                    "content": replied_msg.content[:100] if not replied_msg.is_deleted else "Message deleted",
                    "sender": replied_msg.sender
                }

        result.append(msg_data)

    return result


@router.get("/{message_id}", response_model=dict)
async def get_message_by_id(
    message_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get message by ID"""
    message = await Message.get(message_id)

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )

    # Verify user is participant in the chat
    chat = await Chat.get(message.room_id)
    if not chat or str(current_user.id) not in chat.participants:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this chat"
        )

    return {
        "_id": str(message.id),
        "content": message.content,
        "sender": message.sender,
        "roomId": message.room_id,
        "createdAt": message.created_at
    }


@router.delete("/{message_id}")
async def delete_message(
    message_id: str,
    current_user: User = Depends(get_current_user)
):
    """Soft delete a message (marks as deleted, content hidden)"""
    message = await Message.get(message_id)

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )

    # Check if user is the sender
    if message.sender != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own messages"
        )

    # Soft delete - mark as deleted instead of removing
    message.is_deleted = True
    message.deleted_at = datetime.utcnow()
    await message.save()

    return {"message": "Message deleted successfully", "messageId": message_id}
