import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

if (!SOCKET_URL) {
  console.warn('VITE_SOCKET_URL not set. Notification socket will not work.');
}

export let socket = null;

let isConnecting = false;

/**
 * Notification-only socket (likes, saved searches, etc.).
 * Chat real-time uses lib/chatSocket.js.
 */
export function connectSocket(token) {
  if (!SOCKET_URL) {
    console.warn('Cannot connect socket: VITE_SOCKET_URL not configured');
    return null;
  }

  const authToken = token || localStorage.getItem('token');
  if (!authToken) return null;

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

  return socket;
}

export function initSocket(token) {
  return connectSocket(token);
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  isConnecting = false;
}

export default {
  socket,
  initSocket,
  connectSocket,
  getSocket,
  disconnectSocket,
};
