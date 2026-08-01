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


def new_chat_document(participants: list[str]) -> Chat:
    """A fresh chat with every participant's read cursor started at now.

    Seeding at creation is what makes the first message that arrives count as
    unread, rather than being swallowed by an absent-cursor default.
    """
    now = datetime.utcnow()
    return Chat(
        participants=participants,
        messages=[],
        last_message=None,
        last_read={pid: now for pid in participants},
    )


async def ensure_read_cursor(chat: Chat, user_id: str) -> bool:
    """Give a participant a starting cursor if they have none.

    Chats that predate read tracking would otherwise report their whole history
    as unread the first time a client asks. Returns whether it wrote.
    """
    if user_id in chat.last_read:
        return False
    chat.last_read[user_id] = datetime.utcnow()
    await chat.save()
    return True


async def unread_count_for(chat: Chat, user_id: str) -> int:
    """Messages from someone else, since this user last read the chat."""
    cursor = chat.last_read.get(user_id)
    if cursor is None:
        return 0
    return await Message.find(
        {
            "roomId": str(chat.id),
            "createdAt": {"$gt": cursor},
            "sender": {"$ne": user_id},
            "isDeleted": {"$ne": True},
        }
    ).count()


async def mark_chat_read(chat: Chat, user_id: str) -> datetime:
    """Advance the caller's read cursor and tell the other participants."""
    read_at = datetime.utcnow()
    chat.last_read[user_id] = read_at
    await chat.save()

    from app.core.socket import emit_to_participants

    await emit_to_participants(
        "chat_read",
        {"chatId": str(chat.id), "userId": user_id, "readAt": read_at.isoformat()},
        chat.participants,
    )
    return read_at


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

    await ensure_read_cursor(chat, current_user_id)

    return {
        "_id": str(chat.id),
        "id": str(chat.id),
        "participants": chat.participants,
        "otherUser": other_user,
        "lastMessage": last_message_data,
        "unreadCount": await unread_count_for(chat, current_user_id),
        "updatedAt": chat.updated_at.isoformat() if chat.updated_at else None,
    }


async def enrich_chat_detail(chat: Chat, current_user_id: str) -> dict:
    other_user_id = next((p for p in chat.participants if p != current_user_id), None)
    profiles = await user_client.get_users_batch([other_user_id] if other_user_id else [])
    other_user = await format_other_user(profiles.get(other_user_id) if other_user_id else None)

    await ensure_read_cursor(chat, current_user_id)

    return {
        "_id": str(chat.id),
        "id": str(chat.id),
        "participants": chat.participants,
        "otherUser": other_user,
        "messages": chat.messages,
        "lastMessage": chat.last_message,
        "unreadCount": await unread_count_for(chat, current_user_id),
        "updatedAt": chat.updated_at.isoformat() if chat.updated_at else None,
    }


async def create_message_in_chat(
    *,
    chat_id: str,
    sender_id: str,
    content: str,
    reply_to: Optional[str] = None,
    temp_id: Optional[str] = None,
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

    await broadcast_new_message(message, reply_to_data, chat.participants, temp_id=temp_id)

    return message, reply_to_data


async def broadcast_new_message(
    message: Message,
    reply_to_data: Optional[dict],
    participants: list[str],
    temp_id: Optional[str] = None,
) -> None:
    """Push a new message to participants over Socket.IO.

    Imported late because app.core.socket imports this module at import time;
    this mirrors how the main service reaches send_notification.
    """
    from app.core.socket import emit_to_participants

    payload = {"chatId": message.room_id, "message": message_to_dict(message, reply_to_data)}
    if temp_id:
        # Echoed so the sender's sessions can replace the right optimistic
        # bubble; matching on content collides on short repeated messages.
        payload["message"]["tempId"] = temp_id
    await emit_to_participants("new_message", payload, participants)


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


DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 100


async def load_message_page(
    *,
    room_id: str,
    limit: int = DEFAULT_PAGE_SIZE,
    before: Optional[str] = None,
    skip: int = 0,
) -> dict:
    """Return the newest page of a conversation, oldest-first for rendering.

    `before` is a message ID to page backwards from. Unlike skip/limit it does
    not drift as new messages arrive, which otherwise makes a client scrolling
    up see duplicates or holes. skip is still honoured for clients built against
    the previous contract.
    """
    limit = max(1, min(limit, MAX_PAGE_SIZE))

    query: dict = {"roomId": room_id}
    anchor = await Message.get(before) if before else None
    if anchor:
        # Keyset rather than offset: everything strictly older than the anchor,
        # with _id breaking ties on identical timestamps.
        query["$or"] = [
            {"createdAt": {"$lt": anchor.created_at}},
            {"createdAt": anchor.created_at, "_id": {"$lt": anchor.id}},
        ]

    finder = Message.find(query).sort("-createdAt", "-_id")
    if skip:
        finder = finder.skip(skip)

    # Reading one extra row answers "is there an older page" exactly, where
    # len(page) == limit is wrong whenever the total is a multiple of the size.
    page = await finder.limit(limit + 1).to_list()
    has_more = len(page) > limit
    page = page[:limit]
    page.reverse()

    return {
        "messages": [await format_message_with_reply(msg) for msg in page],
        "hasMore": has_more,
        "nextBefore": str(page[0].id) if page else None,
    }


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

    from app.core.socket import emit_to_participants

    chat = await Chat.get(message.room_id)
    payload = {"chatId": message.room_id, "messageId": message_id}
    await emit_to_participants("message_deleted", payload, chat.participants if chat else [user_id])

    return message.room_id, message_id
