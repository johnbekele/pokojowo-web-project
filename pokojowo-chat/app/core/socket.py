"""Chat-only Socket.IO server."""
import logging

import socketio

from app.core.config import settings
from app.core.security import decode_token
from app.models.chat import Chat
from app.services import chat_service, user_client

logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else "*",
    logger=settings.DEBUG,
    engineio_logger=settings.DEBUG,
)

connected_users: dict[str, str] = {}


async def get_user_from_sid(sid: str) -> str | None:
    return connected_users.get(sid)


async def get_sids_for_user(user_id: str) -> list:
    return [sid for sid, uid in connected_users.items() if uid == user_id]


async def emit_to_participants(event: str, payload: dict, participants: list[str]) -> None:
    """Deliver an event to every live session of every participant.

    Addressing sessions directly rather than emitting to the chat room reaches a
    participant sitting on the chat list who never ran join_chat, and stops
    anyone receiving two copies for being both a room member and a participant.
    """
    for user_id in participants:
        for sid in await get_sids_for_user(user_id):
            await sio.emit(event, payload, room=sid)


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
    except Exception:
        logger.error("Error broadcasting user status")


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
    temp_id = data.get("tempId")

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
        message, _ = await chat_service.create_message_in_chat(
            chat_id=chat_id,
            sender_id=user_id,
            content=content,
            reply_to=reply_to,
            temp_id=temp_id,
        )
    except ValueError as e:
        errors = {
            "CHAT_NOT_FOUND": "Chat not found",
            "NOT_PARTICIPANT": "You are not a participant in this chat",
            "BLOCKED": "You cannot message this user",
        }
        await sio.emit("error", {"message": errors.get(str(e), "Failed to send message")}, room=sid)
        return
    except Exception:
        logger.error("Error sending chat message")
        await sio.emit("error", {"message": "Failed to send message"}, room=sid)
        return

    # create_message_in_chat broadcasts to participants itself, so that REST
    # callers get the same delivery; only the sender's ack belongs here.
    ack = {"success": True, "messageId": str(message.id), "chatId": chat_id}
    if temp_id:
        ack["tempId"] = temp_id
    await sio.emit("message_sent", ack, room=sid)


@sio.event
async def load_messages(sid, data):
    chat_id = data.get("chatId") or data.get("room")
    skip = data.get("skip", 0)
    limit = data.get("limit", chat_service.DEFAULT_PAGE_SIZE)
    before = data.get("before")

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

    page = await chat_service.load_message_page(
        room_id=chat_id, limit=limit, before=before, skip=skip
    )
    await sio.emit("message_history", {"chatId": chat_id, **page}, room=sid)


@sio.event
async def mark_read(sid, data):
    chat_id = data.get("chatId") or data.get("room")
    user_id = await get_user_from_sid(sid)
    if not chat_id:
        await sio.emit("error", {"message": "Chat ID required"}, room=sid)
        return
    if not user_id:
        await sio.emit("error", {"message": "Authentication required"}, room=sid)
        return

    chat = await Chat.get(chat_id)
    if not chat or user_id not in chat.participants:
        await sio.emit("error", {"message": "Chat not found or access denied"}, room=sid)
        return

    await chat_service.mark_chat_read(chat, user_id)


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

    # soft_delete_message broadcasts to participants itself; see send_message.
    await sio.emit("delete_success", {"success": True, "messageId": msg_id}, room=sid)
