"""Consolidated chat business logic shared by REST and Socket.IO."""
from datetime import datetime
from typing import Optional

from app.models.chat import Chat
from app.models.message import Message
from app.services import user_client


async def check_participant_blocks(user_id: str, chat: Chat) -> bool:
    """Return True if messaging is blocked between user and any other participant."""
    for pid in chat.participants:
        if pid == user_id:
            continue
        if await user_client.is_blocked_between(user_id, pid):
            return True
    return False


async def format_other_user(profile: Optional[dict]) -> Optional[dict]:
    if not profile:
        return None
    return {
        "_id": profile["id"],
        "id": profile["id"],
        "firstname": profile.get("firstname"),
        "lastname": profile.get("lastname"),
        "photo": profile.get("photo"),
        "isOnline": profile.get("isOnline", False),
    }


async def enrich_chat_list_item(chat: Chat, current_user_id: str) -> dict:
    other_user_id = next((p for p in chat.participants if p != current_user_id), None)
    profiles = await user_client.get_users_batch([other_user_id] if other_user_id else [])
    other_user = await format_other_user(profiles.get(other_user_id) if other_user_id else None)

    last_message_data = None
    if chat.last_message:
        last_msg = await Message.get(chat.last_message)
        if last_msg:
            last_message_data = {
                "_id": str(last_msg.id),
                "content": last_msg.content,
                "sender": last_msg.sender,
                "createdAt": last_msg.created_at.isoformat() if last_msg.created_at else None,
            }

    return {
        "_id": str(chat.id),
        "id": str(chat.id),
        "participants": chat.participants,
        "otherUser": other_user,
        "lastMessage": last_message_data,
        "updatedAt": chat.updated_at.isoformat() if chat.updated_at else None,
    }


async def enrich_chat_detail(chat: Chat, current_user_id: str) -> dict:
    other_user_id = next((p for p in chat.participants if p != current_user_id), None)
    profiles = await user_client.get_users_batch([other_user_id] if other_user_id else [])
    other_user = await format_other_user(profiles.get(other_user_id) if other_user_id else None)

    return {
        "_id": str(chat.id),
        "id": str(chat.id),
        "participants": chat.participants,
        "otherUser": other_user,
        "messages": chat.messages,
        "lastMessage": chat.last_message,
        "updatedAt": chat.updated_at.isoformat() if chat.updated_at else None,
    }


async def create_message_in_chat(
    *,
    chat_id: str,
    sender_id: str,
    content: str,
    reply_to: Optional[str] = None,
) -> tuple[Message, Optional[dict]]:
    chat = await Chat.get(chat_id)
    if not chat:
        raise ValueError("CHAT_NOT_FOUND")
    if sender_id not in chat.participants:
        raise ValueError("NOT_PARTICIPANT")
    if await check_participant_blocks(sender_id, chat):
        raise ValueError("BLOCKED")

    reply_to_data = None
    if reply_to:
        replied_msg = await Message.get(reply_to)
        if replied_msg and replied_msg.room_id == chat_id:
            reply_to_data = {
                "_id": str(replied_msg.id),
                "content": replied_msg.content[:100] if not replied_msg.is_deleted else "Message deleted",
                "sender": replied_msg.sender,
            }

    message = Message(content=content, sender=sender_id, room_id=chat_id, reply_to=reply_to)
    await message.insert()

    chat.messages.append(str(message.id))
    chat.last_message = str(message.id)
    chat.updated_at = datetime.utcnow()
    await chat.save()

    return message, reply_to_data


def message_to_dict(message: Message, reply_to_data: Optional[dict] = None) -> dict:
    return {
        "_id": str(message.id),
        "id": str(message.id),
        "content": message.content if not message.is_deleted else None,
        "sender": message.sender,
        "senderId": message.sender,
        "roomId": message.room_id,
        "createdAt": message.created_at.isoformat() if message.created_at else None,
        "replyTo": message.reply_to,
        "replyToData": reply_to_data,
        "isDeleted": message.is_deleted,
    }


async def format_message_with_reply(message: Message) -> dict:
    reply_to_data = None
    if message.reply_to:
        replied_msg = await Message.get(message.reply_to)
        if replied_msg:
            reply_to_data = {
                "_id": str(replied_msg.id),
                "content": replied_msg.content[:100] if not replied_msg.is_deleted else "Message deleted",
                "sender": replied_msg.sender,
            }
    return message_to_dict(message, reply_to_data)


async def soft_delete_message(message_id: str, user_id: str) -> tuple[str, str]:
    """Soft-delete a message. Returns (chat_id, message_id)."""
    message = await Message.get(message_id)
    if not message:
        raise ValueError("MESSAGE_NOT_FOUND")
    if message.sender != user_id:
        raise ValueError("NOT_SENDER")

    message.is_deleted = True
    message.deleted_at = datetime.utcnow()
    await message.save()
    return message.room_id, message_id
