import socketio
from app.core.config import settings
from app.core.security import decode_token
from app.models.user import User
from app.models.message import Message
from app.models.chat import Chat
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else "*",
    logger=True,
    engineio_logger=True
)

# Store sid -> user_id mapping for authenticated connections
connected_users = {}


async def get_user_from_sid(sid: str) -> str | None:
    """Get user_id from socket session id"""
    return connected_users.get(sid)


async def get_sids_for_user(user_id: str) -> list:
    """Get all socket IDs for a specific user"""
    return [sid for sid, uid in connected_users.items() if uid == user_id]


@sio.event
async def connect(sid, environ, auth=None):
    """Handle client connection with JWT authentication"""
    logger.info(f"Client attempting to connect: {sid}")

    # Extract token from auth
    token = None
    if auth and isinstance(auth, dict):
        token = auth.get('token')

    if not token:
        logger.warning(f"Client {sid} connection rejected: No token provided")
        await sio.emit('connection', {'status': 'connected', 'authenticated': False, 'sid': sid}, room=sid)
        return True

    # Validate JWT token
    payload = decode_token(token)
    if not payload:
        logger.warning(f"Client {sid} connection rejected: Invalid token")
        await sio.emit('connection', {'status': 'connected', 'authenticated': False, 'error': 'Invalid token', 'sid': sid}, room=sid)
        return True

    user_id = payload.get('user_id')
    if not user_id:
        logger.warning(f"Client {sid} connection rejected: No user_id in token")
        await sio.emit('connection', {'status': 'connected', 'authenticated': False, 'error': 'Invalid token payload', 'sid': sid}, room=sid)
        return True

    # Verify user exists and is active
    try:
        user = await User.get(user_id)
        if not user or not user.is_active:
            logger.warning(f"Client {sid} connection rejected: User not found or inactive")
            await sio.emit('connection', {'status': 'connected', 'authenticated': False, 'error': 'User not found', 'sid': sid}, room=sid)
            return True

        # Update user online status
        user.is_online = True
        user.last_active = datetime.utcnow()
        await user.save()

    except Exception as e:
        logger.error(f"Error fetching user for {sid}: {e}")
        await sio.emit('connection', {'status': 'connected', 'authenticated': False, 'error': 'Authentication error', 'sid': sid}, room=sid)
        return True

    # Store authenticated user
    connected_users[sid] = user_id
    logger.info(f"Client {sid} authenticated as user {user_id}")

    # Notify other users that this user is online
    await broadcast_user_status(user_id, True)

    await sio.emit('connection', {
        'status': 'connected',
        'authenticated': True,
        'sid': sid,
        'userId': user_id
    }, room=sid)

    return True


@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    user_id = connected_users.pop(sid, None)
    logger.info(f"Client disconnected: {sid} (user: {user_id})")

    if user_id:
        # Check if user has other active connections
        other_sids = await get_sids_for_user(user_id)
        if not other_sids:
            # No other connections, mark user as offline
            try:
                user = await User.get(user_id)
                if user:
                    user.is_online = False
                    user.last_active = datetime.utcnow()
                    await user.save()
                    # Notify other users that this user is offline
                    await broadcast_user_status(user_id, False)
            except Exception as e:
                logger.error(f"Error updating user offline status: {e}")


async def broadcast_user_status(user_id: str, is_online: bool):
    """Broadcast user online/offline status to relevant users"""
    try:
        # Get user's chats to notify participants
        chats = await Chat.find({"participants": user_id}).to_list()
        for chat in chats:
            for participant_id in chat.participants:
                if participant_id != user_id:
                    # Send status update to each participant
                    participant_sids = await get_sids_for_user(participant_id)
                    for psid in participant_sids:
                        await sio.emit('user_status', {
                            'userId': user_id,
                            'isOnline': is_online
                        }, room=psid)
    except Exception as e:
        logger.error(f"Error broadcasting user status: {e}")


@sio.event
async def join_room(sid, data):
    """Join a chat room (legacy)"""
    room = data.get('room') or data.get('roomId')
    if room:
        await sio.enter_room(sid, room)
        logger.info(f"Client {sid} joined room {room}")
        await sio.emit('joined_room', {'room': room}, room=sid)


@sio.event
async def join_chat(sid, data):
    """Join a chat room with authentication check"""
    chat_id = data.get('chatId') or data.get('room')
    user_id = await get_user_from_sid(sid)

    if not chat_id:
        await sio.emit('error', {'message': 'Chat ID required'}, room=sid)
        return

    if not user_id:
        await sio.emit('error', {'message': 'Authentication required'}, room=sid)
        return

    # Verify user is participant in chat
    try:
        chat = await Chat.get(chat_id)
        if not chat:
            await sio.emit('error', {'message': 'Chat not found'}, room=sid)
            return

        if user_id not in chat.participants:
            await sio.emit('error', {'message': 'You are not a participant in this chat'}, room=sid)
            return
    except Exception as e:
        logger.error(f"Error verifying chat participation for {sid}: {e}")
        await sio.emit('error', {'message': 'Could not verify chat access'}, room=sid)
        return

    await sio.enter_room(sid, chat_id)
    logger.info(f"Client {sid} (user {user_id}) joined chat {chat_id}")
    await sio.emit('joined_chat', {'chatId': chat_id}, room=sid)


@sio.event
async def leave_room(sid, data):
    """Leave a chat room (legacy)"""
    room = data.get('room') or data.get('roomId')
    if room:
        await sio.leave_room(sid, room)
        logger.info(f"Client {sid} left room {room}")
        await sio.emit('left_room', {'room': room}, room=sid)


@sio.event
async def leave_chat(sid, data):
    """Leave a chat room"""
    chat_id = data.get('chatId') or data.get('room')
    if chat_id:
        await sio.leave_room(sid, chat_id)
        logger.info(f"Client {sid} left chat {chat_id}")
        await sio.emit('left_chat', {'chatId': chat_id}, room=sid)


@sio.event
async def send_message(sid, data):
    """Handle sending a message with database persistence"""
    chat_id = data.get('chatId') or data.get('room')
    content = data.get('content') or data.get('message')
    reply_to = data.get('replyTo')  # Optional: message ID being replied to

    if not chat_id or not content:
        await sio.emit('error', {'message': 'Chat ID and content required'}, room=sid)
        return

    user_id = await get_user_from_sid(sid)
    if not user_id:
        await sio.emit('error', {'message': 'Authentication required'}, room=sid)
        return

    try:
        # Verify chat exists and user is participant
        chat = await Chat.get(chat_id)
        if not chat:
            await sio.emit('error', {'message': 'Chat not found'}, room=sid)
            return

        if user_id not in chat.participants:
            await sio.emit('error', {'message': 'You are not a participant in this chat'}, room=sid)
            return

        # If replying, get the replied message for context
        reply_to_data = None
        if reply_to:
            replied_msg = await Message.get(reply_to)
            if replied_msg and replied_msg.room_id == chat_id:
                reply_to_data = {
                    '_id': str(replied_msg.id),
                    'content': replied_msg.content[:100] if not replied_msg.is_deleted else 'Message deleted',
                    'sender': replied_msg.sender
                }

        # Create and save message to database
        message = Message(
            content=content,
            sender=user_id,
            room_id=chat_id,
            reply_to=reply_to
        )
        await message.insert()

        # Update chat with new message
        chat.messages.append(str(message.id))
        chat.last_message = str(message.id)
        chat.updated_at = datetime.utcnow()
        await chat.save()

        # Prepare message data for broadcast
        message_data = {
            'chatId': chat_id,
            'message': {
                '_id': str(message.id),
                'id': str(message.id),
                'content': message.content,
                'sender': user_id,
                'senderId': user_id,
                'roomId': chat_id,
                'createdAt': message.created_at.isoformat() if message.created_at else datetime.utcnow().isoformat(),
                'replyTo': reply_to,
                'replyToData': reply_to_data,
                'isDeleted': False
            }
        }

        # Broadcast message to all clients in the room
        await sio.emit('new_message', message_data, room=chat_id)
        logger.info(f"Message broadcast to room {chat_id} from user {user_id}")

        # Also send directly to all participants' sockets as backup
        # This ensures delivery even if room membership is lost
        for participant_id in chat.participants:
            participant_sids = await get_sids_for_user(participant_id)
            for psid in participant_sids:
                await sio.emit('new_message', message_data, room=psid)
                logger.info(f"Message sent directly to socket {psid} (user {participant_id})")

        # Send confirmation to sender
        await sio.emit('message_sent', {
            'success': True,
            'messageId': str(message.id),
            'chatId': chat_id
        }, room=sid)

        # Send notification to other participants
        for participant_id in chat.participants:
            if participant_id != user_id:
                participant_sids = await get_sids_for_user(participant_id)
                for psid in participant_sids:
                    await sio.emit('notification', {
                        'type': 'new_message',
                        'chatId': chat_id,
                        'senderId': user_id,
                        'preview': content[:100] if len(content) > 100 else content,
                        'messageId': str(message.id)
                    }, room=psid)

    except Exception as e:
        logger.error(f"Error sending message from {sid}: {e}")
        await sio.emit('error', {'message': 'Failed to send message'}, room=sid)


@sio.event
async def load_messages(sid, data):
    """Load message history for a chat"""
    chat_id = data.get('chatId') or data.get('room')
    skip = data.get('skip', 0)
    limit = data.get('limit', 50)

    if not chat_id:
        await sio.emit('error', {'message': 'Chat ID required'}, room=sid)
        return

    user_id = await get_user_from_sid(sid)
    if not user_id:
        await sio.emit('error', {'message': 'Authentication required'}, room=sid)
        return

    try:
        # Verify chat exists and user is participant
        chat = await Chat.get(chat_id)
        if not chat:
            await sio.emit('error', {'message': 'Chat not found'}, room=sid)
            return

        if user_id not in chat.participants:
            await sio.emit('error', {'message': 'You are not a participant in this chat'}, room=sid)
            return

        # Fetch messages from database - use correct Beanie sort syntax
        messages = await Message.find({"roomId": chat_id}).sort("createdAt").skip(skip).limit(limit).to_list()

        messages_list = []
        for msg in messages:
            msg_data = {
                '_id': str(msg.id),
                'id': str(msg.id),
                'content': msg.content if not msg.is_deleted else None,
                'sender': msg.sender,
                'senderId': msg.sender,
                'roomId': msg.room_id,
                'createdAt': msg.created_at.isoformat() if msg.created_at else None,
                'replyTo': msg.reply_to,
                'isDeleted': msg.is_deleted
            }

            # Include replied message data if this is a reply
            if msg.reply_to:
                replied_msg = await Message.get(msg.reply_to)
                if replied_msg:
                    msg_data['replyToData'] = {
                        '_id': str(replied_msg.id),
                        'content': replied_msg.content[:100] if not replied_msg.is_deleted else 'Message deleted',
                        'sender': replied_msg.sender
                    }

            messages_list.append(msg_data)

        await sio.emit('message_history', {
            'chatId': chat_id,
            'messages': messages_list,
            'hasMore': len(messages) == limit
        }, room=sid)

        logger.info(f"Sent {len(messages)} messages history for chat {chat_id} to {sid}")

    except Exception as e:
        logger.error(f"Error loading messages for {sid}: {e}")
        await sio.emit('error', {'message': 'Failed to load messages'}, room=sid)


@sio.event
async def typing(sid, data):
    """Handle typing indicator"""
    chat_id = data.get('chatId') or data.get('room')
    user_id = await get_user_from_sid(sid)

    if chat_id and user_id:
        # Notify others in the room that user is typing
        await sio.emit('typing', {
            'chatId': chat_id,
            'userId': user_id,
            'isTyping': data.get('isTyping', True)
        }, room=chat_id, skip_sid=sid)


async def send_notification(user_id: str, notification: dict):
    """Send notification to a specific user (all their connections)"""
    sids = await get_sids_for_user(user_id)
    for sid in sids:
        await sio.emit('notification', notification, room=sid)


async def broadcast_message(room: str, message: dict):
    """Broadcast message to a room"""
    await sio.emit('new_message', message, room=room)


@sio.event
async def delete_message(sid, data):
    """Handle deleting a message (soft delete)"""
    message_id = data.get('messageId')

    if not message_id:
        await sio.emit('error', {'message': 'Message ID required'}, room=sid)
        return

    user_id = await get_user_from_sid(sid)
    if not user_id:
        await sio.emit('error', {'message': 'Authentication required'}, room=sid)
        return

    try:
        # Get the message
        message = await Message.get(message_id)
        if not message:
            await sio.emit('error', {'message': 'Message not found'}, room=sid)
            return

        # Verify user is the sender (can only delete own messages)
        if message.sender != user_id:
            await sio.emit('error', {'message': 'You can only delete your own messages'}, room=sid)
            return

        # Soft delete the message
        message.is_deleted = True
        message.deleted_at = datetime.utcnow()
        await message.save()

        chat_id = message.room_id

        # Broadcast deletion to all participants
        delete_data = {
            'chatId': chat_id,
            'messageId': message_id
        }

        # Broadcast to room
        await sio.emit('message_deleted', delete_data, room=chat_id)

        # Also send directly to all participants' sockets
        chat = await Chat.get(chat_id)
        if chat:
            for participant_id in chat.participants:
                participant_sids = await get_sids_for_user(participant_id)
                for psid in participant_sids:
                    await sio.emit('message_deleted', delete_data, room=psid)

        # Confirm to sender
        await sio.emit('delete_success', {
            'success': True,
            'messageId': message_id
        }, room=sid)

        logger.info(f"Message {message_id} deleted by user {user_id}")

    except Exception as e:
        logger.error(f"Error deleting message from {sid}: {e}")
        await sio.emit('error', {'message': 'Failed to delete message'}, room=sid)
