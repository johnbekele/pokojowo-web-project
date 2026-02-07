import { io } from 'socket.io-client';

// Socket URL must be set in environment variables for production
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

if (!SOCKET_URL) {
  console.warn('VITE_SOCKET_URL not set. Real-time features will not work.');
}

// Export the socket instance directly
export let socket = null;

// Store rooms to rejoin on reconnect
let activeRooms = new Set();

/**
 * Connect/initialize socket - ensures only one socket connection exists
 */
export function connectSocket(token) {
  // Don't create socket without URL
  if (!SOCKET_URL) {
    console.warn('Cannot connect socket: VITE_SOCKET_URL not configured');
    return null;
  }

  // Get token from localStorage if not provided
  const authToken = token || localStorage.getItem('token');

  // Don't create socket without token
  if (!authToken) {
    console.warn('No token available for socket connection');
    return null;
  }

  // If socket already exists and is connected, return it
  if (socket?.connected) {
    return socket;
  }

  // If socket exists but disconnected, reconnect with token
  if (socket && !socket.connected) {
    socket.auth = { token: authToken };
    socket.connect();
    return socket;
  }

  // Create new socket
  socket = io(SOCKET_URL, {
    auth: {
      token: authToken,
    },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    // Re-join any active rooms on reconnect
    activeRooms.forEach((roomId) => {
      console.log('Re-joining room after reconnect:', roomId);
      socket.emit('join_chat', { chatId: roomId });
    });
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    // Don't clear socket - allow reconnection
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
    // If auth error, try to reconnect with fresh token
    if (error.message?.includes('auth') || error.message?.includes('token')) {
      const freshToken = localStorage.getItem('token');
      if (freshToken && freshToken !== socket.auth?.token) {
        console.log('Retrying socket connection with fresh token');
        socket.auth = { token: freshToken };
        socket.connect();
      }
    }
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('Socket reconnected after', attemptNumber, 'attempts');
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('Socket reconnection attempt:', attemptNumber);
  });

  return socket;
}

/**
 * Initialize socket connection (alias for connectSocket)
 */
export function initSocket(token) {
  return connectSocket(token);
}

/**
 * Get existing socket instance
 */
export function getSocket() {
  return socket;
}

/**
 * Disconnect socket (for logout)
 */
export function disconnectSocket() {
  if (socket) {
    activeRooms.clear();
    socket.disconnect();
    socket = null;
  }
}

/**
 * Join a chat room
 */
export function joinRoom(roomId) {
  if (socket && roomId) {
    activeRooms.add(roomId);
    socket.emit('join_chat', { chatId: roomId });
  }
}

/**
 * Leave a chat room
 */
export function leaveRoom(roomId) {
  if (socket && roomId) {
    activeRooms.delete(roomId);
    socket.emit('leave_chat', { chatId: roomId });
  }
}

/**
 * Track active room (for reconnection)
 */
export function trackRoom(roomId) {
  if (roomId) {
    activeRooms.add(roomId);
  }
}

/**
 * Untrack room
 */
export function untrackRoom(roomId) {
  if (roomId) {
    activeRooms.delete(roomId);
  }
}

/**
 * Send a message
 */
export function sendMessage(chatId, content) {
  if (socket) {
    socket.emit('send_message', { chatId, content });
  }
}

/**
 * Send typing indicator
 */
export function sendTyping(chatId, isTyping) {
  if (socket) {
    socket.emit('typing', { chatId, isTyping });
  }
}

export default {
  socket,
  initSocket,
  connectSocket,
  getSocket,
  disconnectSocket,
  joinRoom,
  leaveRoom,
  trackRoom,
  untrackRoom,
  sendMessage,
  sendTyping,
};
