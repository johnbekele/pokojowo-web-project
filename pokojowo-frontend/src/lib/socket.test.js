import { beforeEach, describe, expect, it, vi } from 'vitest';

const io = vi.fn();
vi.mock('socket.io-client', () => ({ io }));

describe('notification socket lifecycle', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_SOCKET_URL', 'https://socket.test');
    io.mockReset();
  });

  it('connects with the token and reconnects an existing socket with fresh auth', async () => {
    const handlers = {};
    const fakeSocket = {
      connected: false,
      auth: null,
      on: vi.fn((event, handler) => {
        handlers[event] = handler;
      }),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    io.mockReturnValue(fakeSocket);

    const socketModule = await import('./socket');
    const connected = socketModule.connectSocket('first-token');

    expect(connected).toBe(fakeSocket);
    expect(io).toHaveBeenCalledWith(
      'https://socket.test',
      expect.objectContaining({ auth: { token: 'first-token' }, reconnection: true })
    );

    handlers.connect();
    fakeSocket.connected = false;
    const reconnected = socketModule.connectSocket('rotated-token');
    expect(reconnected).toBe(fakeSocket);
    expect(fakeSocket.auth).toEqual({ token: 'rotated-token' });
    expect(fakeSocket.connect).toHaveBeenCalled();

    socketModule.disconnectSocket();
    expect(fakeSocket.disconnect).toHaveBeenCalled();
  });
});
