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
    expect(useAuthStore.getState().user).toEqual(user);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});
