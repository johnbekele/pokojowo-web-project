jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}));
jest.mock('expo-secure-store', () => {
  const values: Record<string, string> = {};

  return {
    __values: values,
    getItemAsync: jest.fn(async (key: string) => values[key] ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      values[key] = value;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      delete values[key];
    }),
  };
});
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
  clear: jest.fn(async () => undefined),
}));
jest.mock('@/lib/socket', () => ({
  connectSocket: jest.fn(),
  disconnectSocket: jest.fn(),
}));
jest.mock('@/lib/chatSocket', () => ({
  connectChatSocket: jest.fn(),
  disconnectChatSocket: jest.fn(),
}));
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'pokojowo://auth/callback'),
}));
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));
jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: { apiUrl: 'https://api.example.test/api' } } },
}));

import useAuthStore from './authStore';

const mockApi = jest.requireMock('@/lib/api').default as {
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
};
const mockSecureStore = jest.requireMock('expo-secure-store') as {
  __values: Record<string, string>;
  getItemAsync: jest.Mock;
  setItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
};
const mockWebBrowser = jest.requireMock('expo-web-browser') as {
  openAuthSessionAsync: jest.Mock;
};

describe('mobile auth store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockSecureStore.__values).forEach((key) => delete mockSecureStore.__values[key]);
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  it('persists OAuth callback tokens and hydrates the user before returning', async () => {
    const user = { _id: 'user-1', role: ['Tenant'], username: 'tenant' };
    mockApi.get.mockResolvedValueOnce({ data: user });

    await useAuthStore.getState().handleOAuthCallback('access-token', 'refresh-token');

    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('token', 'access-token');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('refreshToken', 'refresh-token');
    expect(mockApi.get).toHaveBeenCalledWith('/users/me');
    expect(useAuthStore.getState().user).toMatchObject({ ...user, id: 'user-1' });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('completes Google OAuth from the custom-scheme callback', async () => {
    const user = { _id: 'google-user', role: ['Tenant'], username: 'google-user' };
    mockWebBrowser.openAuthSessionAsync.mockResolvedValueOnce({
      type: 'success',
      url: 'pokojowo://auth/callback?token=google-access&refresh_token=google-refresh',
    });
    mockApi.get.mockResolvedValueOnce({ data: user });

    const result = await useAuthStore.getState().loginWithGoogle();

    expect(result).toMatchObject({ success: true, user: { ...user, id: 'google-user' } });
    expect(mockWebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
      expect.stringContaining('/auth/google?mobile_redirect=pokojowo%3A%2F%2Fauth%2Fcallback'),
      'pokojowo://auth/callback'
    );
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('token', 'google-access');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('refreshToken', 'google-refresh');
  });

  it('leaves auth state untouched when Google OAuth is cancelled', async () => {
    mockWebBrowser.openAuthSessionAsync.mockResolvedValueOnce({ type: 'cancel' });

    await expect(useAuthStore.getState().loginWithGoogle()).resolves.toEqual({
      success: false,
      canceled: true,
    });
    expect(mockSecureStore.__values.token).toBeUndefined();
    expect(mockSecureStore.__values.refreshToken).toBeUndefined();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().refreshToken).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
