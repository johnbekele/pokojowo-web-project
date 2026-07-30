import { io } from 'socket.io-client';

const CHAT_SOCKET_URL =
  import.meta.env.VITE_CHAT_SOCKET_URL || import.meta.env.VITE_SOCKET_URL;

export let chatSocket = null;

let activeRooms = new Set();
let isConnecting = false;

export function connectChatSocket(token) {
  if (!CHAT_SOCKET_URL) {
    console.warn('VITE_CHAT_SOCKET_URL not set. Chat real-time will not work.');
    return null;
  }

  const authToken = token || localStorage.getItem('token');
  if (!authToken) return null;

  if (chatSocket?.connected) return chatSocket;

  if (chatSocket && !chatSocket.connected) {
    chatSocket.auth = { token: authToken };
    chatSocket.connect();
    return chatSocket;
  }

  if (isConnecting) return chatSocket;
  isConnecting = true;

  chatSocket = io(CHAT_SOCKET_URL, {
    path: '/chat-socket.io',
    auth: { token: authToken },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
  });

  chatSocket.on('connect', () => {
    isConnecting = false;
    activeRooms.forEach((roomId) => {
      chatSocket.emit('join_chat', { chatId: roomId });
    });
  });

  chatSocket.on('disconnect', () => {
    isConnecting = false;
  });

  return chatSocket;
}

export function getChatSocket() {
  return chatSocket;
}

export function disconnectChatSocket() {
  if (chatSocket) {
    activeRooms.clear();
    chatSocket.disconnect();
    chatSocket = null;
  }
  isConnecting = false;
}

export function joinChatRoom(roomId) {
  if (chatSocket && roomId) {
    activeRooms.add(roomId);
    chatSocket.emit('join_chat', { chatId: roomId });
  }
}

export function leaveChatRoom(roomId) {
  if (chatSocket && roomId) {
    activeRooms.delete(roomId);
    chatSocket.emit('leave_chat', { chatId: roomId });
  }
}

export function trackChatRoom(roomId) {
  if (roomId) activeRooms.add(roomId);
}

export function untrackChatRoom(roomId) {
  if (roomId) activeRooms.delete(roomId);
}

export function sendChatMessage(chatId, content, replyTo) {
  if (chatSocket) {
    chatSocket.emit('send_message', { chatId, content, replyTo });
  }
}

export function sendChatTyping(chatId, isTyping) {
  if (chatSocket) {
    chatSocket.emit('typing', { chatId, isTyping });
  }
}

export default {
  connectChatSocket,
  getChatSocket,
  disconnectChatSocket,
  joinChatRoom,
  leaveChatRoom,
  trackChatRoom,
  untrackChatRoom,
  sendChatMessage,
  sendChatTyping,
};
