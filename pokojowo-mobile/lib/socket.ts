import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import { storage, STORAGE_KEYS } from './storage';

const SOCKET_URL = Constants.expoConfig?.extra?.socketUrl || 'https://pokojowo-web-project.onrender.com';

export let socket: Socket | null = null;

let isConnecting = false;

/**
 * Notification-only socket (likes, saved searches, etc.).
 * Chat real-time uses lib/chatSocket.ts.
 */
export async function connectSocket(token?: string): Promise<Socket | null> {
  if (!SOCKET_URL) {
    console.warn('Cannot connect socket: SOCKET_URL not configured');
    return null;
  }

  const authToken = token || (await storage.getItem(STORAGE_KEYS.TOKEN));
  if (!authToken) {
    console.warn('No token available for socket connection');
    return null;
  }

  if (socket?.connected) return socket;

  if (socket && !socket.connected) {
    socket.auth = { token: authToken };
    socket.connect();
    return socket;
  }

  if (isConnecting) return socket;
  isConnecting = true;

  socket = io(SOCKET_URL, {
    auth: { token: authToken },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    isConnecting = false;
  });

  socket.on('disconnect', () => {
    isConnecting = false;
  });

  socket.on('connect_error', async (error) => {
    isConnecting = false;
    if (
      error.message?.includes('auth') ||
      error.message?.includes('token') ||
      error.message?.includes('unauthorized')
    ) {
      const freshToken = await storage.getItem(STORAGE_KEYS.TOKEN);
      if (freshToken && socket && freshToken !== (socket.auth as { token?: string })?.token) {
        socket.auth = { token: freshToken };
        setTimeout(() => socket?.connect(), 1000);
      }
    }
  });

  return socket;
}

export function initSocket(token?: string): Promise<Socket | null> {
  return connectSocket(token);
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  isConnecting = false;
}

export default {
  initSocket,
  connectSocket,
  getSocket,
  disconnectSocket,
};
