import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import chatApi from './chatApi';

describe('chat api client', () => {
  let chatMock;
  let axiosMock;

  beforeEach(() => {
    chatMock = new MockAdapter(chatApi);
    axiosMock = new MockAdapter(axios);
    localStorage.setItem('token', 'expired-token');
    localStorage.setItem('refreshToken', 'refresh-token');
  });

  afterEach(() => {
    chatMock.restore();
    axiosMock.restore();
  });

  it('refreshes an expired chat request and retries it', async () => {
    chatMock
      .onGet('/messages')
      .replyOnce(401)
      .onGet('/messages')
      .reply(200, { messages: [] });
    axiosMock.onPost('/api/auth/refresh').reply(200, {
      access_token: 'fresh-token',
      refresh_token: 'rotated-refresh-token',
    });

    const response = await chatApi.get('/messages');

    expect(response.data).toEqual({ messages: [] });
    expect(localStorage.getItem('token')).toBe('fresh-token');
    expect(localStorage.getItem('refreshToken')).toBe('rotated-refresh-token');
    expect(chatMock.history.get[1].headers.Authorization).toBe('Bearer fresh-token');
  });

  it('shares the refresh request with concurrent chat 401 responses', async () => {
    chatMock
      .onGet('/messages')
      .replyOnce(401)
      .onGet('/messages')
      .replyOnce(401)
      .onGet('/messages')
      .reply(200, { messages: [] });
    axiosMock.onPost('/api/auth/refresh').reply(200, {
      access_token: 'fresh-token',
    });

    const responses = await Promise.all([
      chatApi.get('/messages'),
      chatApi.get('/messages'),
    ]);

    expect(responses).toHaveLength(2);
    expect(responses.every((response) => response.data.messages)).toBe(true);
    expect(axiosMock.history.post).toHaveLength(1);
  });
});
