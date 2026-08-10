import { io, Socket } from 'socket.io-client';
import { storage, STORAGE_KEYS } from './storage';
import { CHAT_SOCKET_URL } from './constants';

export let chatSocket: Socket | null = null;

const activeRooms = new Set<string>();
let isConnecting = false;

export async function connectChatSocket(token?: string): Promise<Socket | null> {
  if (!CHAT_SOCKET_URL) return null;

  const authToken = token || (await storage.getItem(STORAGE_KEYS.TOKEN));
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
      chatSocket?.emit('join_chat', { chatId: roomId });
    });
  });

  chatSocket.on('disconnect', () => {
    isConnecting = false;
  });

  chatSocket.on('connect_error', async (error) => {
    isConnecting = false;
    if (
      error.message?.includes('auth') ||
      error.message?.includes('token') ||
      error.message?.includes('unauthorized')
    ) {
      const freshToken = await storage.getItem(STORAGE_KEYS.TOKEN);
      if (freshToken && chatSocket && freshToken !== (chatSocket.auth as { token?: string })?.token) {
        chatSocket.auth = { token: freshToken };
        setTimeout(() => chatSocket?.connect(), 1000);
      }
    }
  });

  return chatSocket;
}

export function getChatSocket(): Socket | null {
  return chatSocket;
}

export function disconnectChatSocket(): void {
  if (chatSocket) {
    activeRooms.clear();
    chatSocket.disconnect();
    chatSocket = null;
  }
  isConnecting = false;
}

export function joinChatRoom(roomId: string): void {
  if (chatSocket && roomId) {
    activeRooms.add(roomId);
    chatSocket.emit('join_chat', { chatId: roomId });
  }
}

export function leaveChatRoom(roomId: string): void {
  if (chatSocket && roomId) {
    activeRooms.delete(roomId);
    chatSocket.emit('leave_chat', { chatId: roomId });
  }
}

export function sendChatMessage(chatId: string, content: string, replyTo?: string): void {
  chatSocket?.emit('send_message', { chatId, content, replyTo });
}

export function sendChatTyping(chatId: string, isTyping: boolean): void {
  chatSocket?.emit('typing', { chatId, isTyping });
}
