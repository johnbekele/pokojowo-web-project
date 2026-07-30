"""Notification-only Socket.IO server (likes, saved searches, etc.)."""
import logging
from datetime import datetime

import socketio

from app.core.config import settings
from app.core.security import decode_token
from app.models.user import User

logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else "*",
    logger=True,
    engineio_logger=True,
)

connected_users: dict[str, str] = {}


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
    if not payload or not payload.get("user_id"):
        await sio.emit(
            "connection",
            {"status": "connected", "authenticated": False, "error": "Invalid token", "sid": sid},
            room=sid,
        )
        return True

    user_id = payload["user_id"]
    try:
        user = await User.get(user_id)
        if not user or not user.is_active:
            await sio.emit(
                "connection",
                {"status": "connected", "authenticated": False, "error": "User not found", "sid": sid},
                room=sid,
            )
            return True

        user.is_online = True
        user.last_active = datetime.utcnow()
        await user.save()
    except Exception as e:
        logger.error("Error fetching user for %s: %s", sid, e)
        await sio.emit(
            "connection",
            {"status": "connected", "authenticated": False, "error": "Authentication error", "sid": sid},
            room=sid,
        )
        return True

    connected_users[sid] = user_id
    logger.info("Client %s authenticated as user %s", sid, user_id)
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
        try:
            user = await User.get(user_id)
            if user:
                user.is_online = False
                user.last_active = datetime.utcnow()
                await user.save()
        except Exception as e:
            logger.error("Error updating user offline status: %s", e)


async def send_notification(user_id: str, notification: dict):
    """Send notification to a specific user (all their connections)."""
    sids = await get_sids_for_user(user_id)
    if not sids:
        logger.warning("No active socket connections for user %s", user_id)
        return

    for sid in sids:
        try:
            await sio.emit("notification", notification, room=sid)
        except Exception as e:
            logger.error("Failed to send notification to socket %s: %s", sid, e)
