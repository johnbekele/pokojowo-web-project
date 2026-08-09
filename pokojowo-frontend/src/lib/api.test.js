import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import api, { normalizeError } from './api';

describe('api client', () => {
  let apiMock;
  let axiosMock;

  beforeEach(() => {
    apiMock = new MockAdapter(api);
    axiosMock = new MockAdapter(axios);
    localStorage.setItem('token', 'expired-token');
    localStorage.setItem('refreshToken', 'refresh-token');
  });

  afterEach(() => {
    apiMock.restore();
    axiosMock.restore();
  });

  it('refreshes an expired access token and retries the request', async () => {
    apiMock
      .onGet('/private')
      .replyOnce(401)
      .onGet('/private')
      .reply(200, { ok: true });
    axiosMock.onPost('/api/auth/refresh').reply(200, {
      access_token: 'fresh-token',
      refresh_token: 'rotated-refresh-token',
    });

    const response = await api.get('/private');

    expect(response.data).toEqual({ ok: true });
    expect(localStorage.getItem('token')).toBe('fresh-token');
    expect(localStorage.getItem('refreshToken')).toBe('rotated-refresh-token');
    expect(apiMock.history.get[1].headers.Authorization).toBe('Bearer fresh-token');
  });

  it('shares one refresh request across concurrent expired requests', async () => {
    apiMock
      .onGet('/private')
      .replyOnce(401)
      .onGet('/private')
      .replyOnce(401)
      .onGet('/private')
      .reply(200, { ok: true });
    axiosMock.onPost('/api/auth/refresh').reply(200, {
      access_token: 'fresh-token',
    });

    const responses = await Promise.all([api.get('/private'), api.get('/private')]);

    expect(responses).toHaveLength(2);
    expect(responses.every((response) => response.data.ok)).toBe(true);
    expect(axiosMock.history.post).toHaveLength(1);
  });

  it('normalizes email-verification errors for UI consumers', () => {
    const error = {
      isEmailNotVerified: true,
      friendlyMessage: 'Verify your email first',
      response: { data: { detail: { code: 'EMAIL_NOT_VERIFIED' } } },
    };

    expect(normalizeError(error)).toEqual({
      message: 'Verify your email first',
      status: 403,
      code: 'EMAIL_NOT_VERIFIED',
      data: { detail: { code: 'EMAIL_NOT_VERIFIED' } },
    });
  });
});
