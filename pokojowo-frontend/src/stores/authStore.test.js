import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
};
const socket = {
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn(),
};
const chatSocket = {
  connectChatSocket: vi.fn(),
  disconnectChatSocket: vi.fn(),
};

vi.mock('@/lib/api', () => ({ default: api }));
vi.mock('@/lib/socket', () => socket);
vi.mock('@/lib/chatSocket', () => chatSocket);
vi.mock('@/lib/sessionTeardown', () => ({ clearSessionData: vi.fn() }));

const { default: useAuthStore } = await import('./authStore');

describe('auth store', () => {
  beforeEach(() => {
    useAuthStore.persist?.clearStorage();
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  it('logs in, persists both tokens, and connects both sockets', async () => {
    const user = { _id: 'u1', email: 'user@example.com', role: ['Tenant'] };
    api.post.mockResolvedValueOnce({
      data: { access_token: 'access', refresh_token: 'refresh', user },
    });

    const result = await useAuthStore.getState().login('user@example.com', 'password');

    expect(result).toEqual({ success: true, user });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(localStorage.getItem('token')).toBe('access');
    expect(localStorage.getItem('refreshToken')).toBe('refresh');
    expect(socket.connectSocket).toHaveBeenCalledWith('access');
    expect(chatSocket.connectChatSocket).toHaveBeenCalledWith('access');
  });

  it('surfaces login failures and clears the loading state', async () => {
    api.post.mockRejectedValueOnce({ response: { data: { detail: 'Bad credentials' } } });

    const result = await useAuthStore.getState().login('user@example.com', 'wrong');

    expect(result).toEqual({ success: false, error: 'Bad credentials' });
    expect(useAuthStore.getState().isLoading).toBe(false);
    expect(useAuthStore.getState().error).toBe('Bad credentials');
  });

  it('clears credentials and disconnects sockets on logout', async () => {
    useAuthStore.getState().setTokens('access', 'refresh');
    api.post.mockResolvedValueOnce({ data: {} });

    await useAuthStore.getState().logout();

    expect(socket.disconnectSocket).toHaveBeenCalled();
    expect(chatSocket.disconnectChatSocket).toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
