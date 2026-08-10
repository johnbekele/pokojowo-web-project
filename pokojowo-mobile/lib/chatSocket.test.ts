jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    connected: true,
    auth: {},
    emit: jest.fn(),
    on: jest.fn(),
    disconnect: jest.fn(),
  })),
}));

jest.mock('./constants', () => ({ CHAT_SOCKET_URL: 'https://chat.example.test' }));
jest.mock('./storage', () => ({
  storage: { getItem: jest.fn() },
  STORAGE_KEYS: { TOKEN: 'token' },
}));

import { io } from 'socket.io-client';
import {
  CHAT_SOCKET_EVENTS,
  connectChatSocket,
  disconnectChatSocket,
  joinChatRoom,
  leaveChatRoom,
  sendChatMessage,
  sendChatTyping,
} from './chatSocket';

describe('chatSocket event contract', () => {
  beforeEach(() => {
    disconnectChatSocket();
    jest.clearAllMocks();
  });

  it('keeps room, message, and typing events behind one helper module', async () => {
    await connectChatSocket('token');
    const socket = (io as jest.Mock).mock.results[0].value as { emit: jest.Mock };

    joinChatRoom('room-1');
    sendChatMessage('room-1', 'hello', 'message-0', 'temp-1');
    sendChatTyping('room-1', true);
    leaveChatRoom('room-1');

    expect(socket.emit).toHaveBeenNthCalledWith(1, CHAT_SOCKET_EVENTS.joinRoom, {
      chatId: 'room-1',
    });
    expect(socket.emit).toHaveBeenNthCalledWith(2, CHAT_SOCKET_EVENTS.sendMessage, {
      chatId: 'room-1',
      content: 'hello',
      replyTo: 'message-0',
      tempId: 'temp-1',
    });
    expect(socket.emit).toHaveBeenNthCalledWith(3, CHAT_SOCKET_EVENTS.typing, {
      chatId: 'room-1',
      isTyping: true,
    });
    expect(socket.emit).toHaveBeenNthCalledWith(4, CHAT_SOCKET_EVENTS.leaveRoom, {
      chatId: 'room-1',
    });
  });
});
