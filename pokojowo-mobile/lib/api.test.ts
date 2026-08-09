import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import api, { normalizeError } from './api';

const tokenStore: Record<string, string> = {
  token: 'expired-token',
  refreshToken: 'refresh-token',
};

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

jest.mock('@/lib/storage', () => ({
  STORAGE_KEYS: { TOKEN: 'token', REFRESH_TOKEN: 'refreshToken', USER: 'user' },
  storage: {
    getItem: jest.fn(async (key: string) => tokenStore[key] || null),
    setItem: jest.fn(async (key: string, value: string) => {
      tokenStore[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete tokenStore[key];
    }),
  },
}));

jest.mock('@/lib/socket', () => ({
  connectSocket: jest.fn(),
  disconnectSocket: jest.fn(),
}));

jest.mock('@/lib/chatSocket', () => ({
  connectChatSocket: jest.fn(),
  disconnectChatSocket: jest.fn(),
}));

describe('mobile api client', () => {
  let apiMock: MockAdapter;
  let axiosMock: MockAdapter;

  beforeEach(() => {
    tokenStore.token = 'expired-token';
    tokenStore.refreshToken = 'refresh-token';
    apiMock = new MockAdapter(api);
    axiosMock = new MockAdapter(axios);
  });

  afterEach(() => {
    apiMock.restore();
    axiosMock.restore();
  });

  it('refreshes an expired token and retries the request', async () => {
    apiMock
      .onGet('/private')
      .replyOnce(401)
      .onGet('/private')
      .reply(200, { ok: true });
    axiosMock.onPost(`${api.defaults.baseURL}/auth/refresh`).reply(200, {
      access_token: 'fresh-token',
      refresh_token: 'rotated-refresh-token',
    });

    const response = await api.get('/private');

    expect(response.data).toEqual({ ok: true });
    expect(tokenStore.token).toBe('fresh-token');
    expect(tokenStore.refreshToken).toBe('rotated-refresh-token');
    expect(apiMock.history.get[1].headers?.Authorization).toBe('Bearer fresh-token');
  });

  it('shares one refresh request across concurrent 401 responses', async () => {
    apiMock
      .onGet('/private')
      .replyOnce(401)
      .onGet('/private')
      .replyOnce(401)
      .onGet('/private')
      .reply(200, { ok: true });
    axiosMock.onPost(`${api.defaults.baseURL}/auth/refresh`).reply(200, {
      access_token: 'fresh-token',
    });

    const responses = await Promise.all([api.get('/private'), api.get('/private')]);

    expect(responses).toHaveLength(2);
    expect(responses.every((response) => response.data.ok)).toBe(true);
    expect(axiosMock.history.post).toHaveLength(1);
  });

  it('normalizes a structured verification error', () => {
    expect(normalizeError({
      isAxiosError: true,
      response: { status: 403, data: { detail: { code: 'EMAIL_NOT_VERIFIED' } } },
    })).toMatchObject({ status: 403 });
  });
});
