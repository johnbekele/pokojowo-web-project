"""Chat-only Socket.IO server."""
import logging
from datetime import datetime

import socketio

from app.core.config import settings
from app.core.security import decode_token
from app.models.chat import Chat
from app.models.message import Message
from app.services import chat_service, user_client

logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else "*",
    logger=True,
    engineio_logger=True,
)

connected_users: dict[str, str] = {}


async def get_user_from_sid(sid: str) -> str | None:
    return connected_users.get(sid)


async def get_sids_for_user(user_id: str) -> list:
    return [sid for sid, uid in connected_users.items() if uid == user_id]


@sio.event
async def connect(sid, environ, auth=None):
    logger.info("Client attempting to connect: %s", sid)
    token = auth.get("token") if auth and isinstance(auth, dict) else None

    if not token:
        await sio.emit("connection", {"status": "connected", "authenticated": False, "sid": sid}, room=sid)
        return True

    payload = decode_token(token)
    if not payload or payload.get("type") != "access" or not payload.get("user_id"):
        await sio.emit(
            "connection",
            {"status": "connected", "authenticated": False, "error": "Invalid token", "sid": sid},
            room=sid,
        )
        return True

    user_id = payload["user_id"]
    if not await user_client.user_exists(user_id):
        await sio.emit(
            "connection",
            {"status": "connected", "authenticated": False, "error": "User not found", "sid": sid},
            room=sid,
        )
        return True

    connected_users[sid] = user_id
    logger.info("Client %s authenticated as user %s", sid, user_id)
    await broadcast_user_status(user_id, True)
    await sio.emit(
        "connection",
        {"status": "connected", "authenticated": True, "sid": sid, "userId": user_id},
        room=sid,
    )
    return True


@sio.event
async def disconnect(sid):
    user_id = connected_users.pop(sid, None)
    logger.info("Client disconnected: %s (user: %s)", sid, user_id)
    if user_id and not await get_sids_for_user(user_id):
        await broadcast_user_status(user_id, False)


async def broadcast_user_status(user_id: str, is_online: bool):
    try:
        chats = await Chat.find({"participants": user_id}).to_list()
        for chat in chats:
            for participant_id in chat.participants:
                if participant_id != user_id:
                    for psid in await get_sids_for_user(participant_id):
                        await sio.emit("user_status", {"userId": user_id, "isOnline": is_online}, room=psid)
    except Exception as e:
        logger.error("Error broadcasting user status: %s", e)


@sio.event
async def join_room(sid, data):
    room = data.get("room") or data.get("roomId")
    if room:
        await sio.enter_room(sid, room)
        await sio.emit("joined_room", {"room": room}, room=sid)


@sio.event
async def join_chat(sid, data):
    chat_id = data.get("chatId") or data.get("room")
    user_id = await get_user_from_sid(sid)
    if not chat_id:
        await sio.emit("error", {"message": "Chat ID required"}, room=sid)
        return
    if not user_id:
        await sio.emit("error", {"message": "Authentication required"}, room=sid)
        return

    chat = await Chat.get(chat_id)
    if not chat:
        await sio.emit("error", {"message": "Chat not found"}, room=sid)
        return
    if user_id not in chat.participants:
        await sio.emit("error", {"message": "You are not a participant in this chat"}, room=sid)
        return

    await sio.enter_room(sid, chat_id)
    await sio.emit("joined_chat", {"chatId": chat_id}, room=sid)


@sio.event
async def leave_room(sid, data):
    room = data.get("room") or data.get("roomId")
    if room:
        await sio.leave_room(sid, room)
        await sio.emit("left_room", {"room": room}, room=sid)


@sio.event
async def leave_chat(sid, data):
    chat_id = data.get("chatId") or data.get("room")
    if chat_id:
        await sio.leave_room(sid, chat_id)
        await sio.emit("left_chat", {"chatId": chat_id}, room=sid)


@sio.event
async def send_message(sid, data):
    chat_id = data.get("chatId") or data.get("room")
    content = data.get("content") or data.get("message")
    reply_to = data.get("replyTo")

    if not chat_id or not content:
        await sio.emit("error", {"message": "Chat ID and content required"}, room=sid)
        return

    user_id = await get_user_from_sid(sid)
    if not user_id:
        await sio.emit("error", {"message": "Authentication required"}, room=sid)
        return

    if not await user_client.is_user_verified(user_id):
        await sio.emit(
            "error",
            {"code": "EMAIL_NOT_VERIFIED", "message": "Please verify your email address to send messages"},
            room=sid,
        )
        return

    try:
        message, reply_to_data = await chat_service.create_message_in_chat(
            chat_id=chat_id,
            sender_id=user_id,
            content=content,
            reply_to=reply_to,
        )
    except ValueError as e:
        errors = {
            "CHAT_NOT_FOUND": "Chat not found",
            "NOT_PARTICIPANT": "You are not a participant in this chat",
            "BLOCKED": "You cannot message this user",
        }
        await sio.emit("error", {"message": errors.get(str(e), "Failed to send message")}, room=sid)
        return
    except Exception as e:
        logger.error("Error sending message from %s: %s", sid, e)
        await sio.emit("error", {"message": "Failed to send message"}, room=sid)
        return

    message_data = {
        "chatId": chat_id,
        "message": {
            **chat_service.message_to_dict(message, reply_to_data),
            "content": message.content,
            "isDeleted": False,
            "createdAt": message.created_at.isoformat() if message.created_at else datetime.utcnow().isoformat(),
        },
    }

    await sio.emit("new_message", message_data, room=chat_id)
    chat = await Chat.get(chat_id)
    if chat:
        for participant_id in chat.participants:
            for psid in await get_sids_for_user(participant_id):
                await sio.emit("new_message", message_data, room=psid)

    await sio.emit("message_sent", {"success": True, "messageId": str(message.id), "chatId": chat_id}, room=sid)


@sio.event
async def load_messages(sid, data):
    chat_id = data.get("chatId") or data.get("room")
    skip = data.get("skip", 0)
    limit = data.get("limit", 50)

    if not chat_id:
        await sio.emit("error", {"message": "Chat ID required"}, room=sid)
        return

    user_id = await get_user_from_sid(sid)
    if not user_id:
        await sio.emit("error", {"message": "Authentication required"}, room=sid)
        return

    chat = await Chat.get(chat_id)
    if not chat or user_id not in chat.participants:
        await sio.emit("error", {"message": "Chat not found or access denied"}, room=sid)
        return

    messages = await Message.find({"roomId": chat_id}).sort("createdAt").skip(skip).limit(limit).to_list()
    messages_list = [await chat_service.format_message_with_reply(msg) for msg in messages]
    await sio.emit(
        "message_history",
        {"chatId": chat_id, "messages": messages_list, "hasMore": len(messages) == limit},
        room=sid,
    )


@sio.event
async def typing(sid, data):
    chat_id = data.get("chatId") or data.get("room")
    user_id = await get_user_from_sid(sid)
    if chat_id and user_id:
        await sio.emit(
            "typing",
            {"chatId": chat_id, "userId": user_id, "isTyping": data.get("isTyping", True)},
            room=chat_id,
            skip_sid=sid,
        )


@sio.event
async def delete_message(sid, data):
    message_id = data.get("messageId")
    if not message_id:
        await sio.emit("error", {"message": "Message ID required"}, room=sid)
        return

    user_id = await get_user_from_sid(sid)
    if not user_id:
        await sio.emit("error", {"message": "Authentication required"}, room=sid)
        return

    try:
        chat_id, msg_id = await chat_service.soft_delete_message(message_id, user_id)
    except ValueError as e:
        errors = {"MESSAGE_NOT_FOUND": "Message not found", "NOT_SENDER": "You can only delete your own messages"}
        await sio.emit("error", {"message": errors.get(str(e), "Failed to delete message")}, room=sid)
        return

    delete_data = {"chatId": chat_id, "messageId": msg_id}
    await sio.emit("message_deleted", delete_data, room=chat_id)
    chat = await Chat.get(chat_id)
    if chat:
        for participant_id in chat.participants:
            for psid in await get_sids_for_user(participant_id):
                await sio.emit("message_deleted", delete_data, room=psid)
    await sio.emit("delete_success", {"success": True, "messageId": msg_id}, room=sid)
