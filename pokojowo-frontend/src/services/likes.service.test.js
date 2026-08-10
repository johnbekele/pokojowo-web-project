import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import api from '@/lib/api';
import likesService from './likes.service';

describe('likes service', () => {
  let apiMock;

  beforeEach(() => {
    apiMock = new MockAdapter(api);
  });

  afterEach(() => {
    apiMock.restore();
  });

  it('loads each server-owned likes collection with pagination', async () => {
    apiMock.onGet('/likes/sent').reply(200, { likes: [] });
    apiMock.onGet('/likes/received').reply(200, { likes: [] });
    apiMock.onGet('/likes/mutual').reply(200, { mutual_matches: [] });
    apiMock.onGet('/likes/stats').reply(200, { likes_sent: 1 });

    await expect(likesService.getLikesSent({ limit: 10, offset: 20 })).resolves.toEqual({ likes: [] });
    await expect(likesService.getLikesReceived()).resolves.toEqual({ likes: [] });
    await expect(likesService.getMutualMatches()).resolves.toEqual({ mutual_matches: [] });
    await expect(likesService.getStats()).resolves.toEqual({ likes_sent: 1 });
    expect(apiMock.history.get[0].params).toEqual({ limit: 10, offset: 20 });
  });

  it('maps like status and mutation responses', async () => {
    apiMock.onGet('/likes/check/user-1').reply(200, { i_liked: true });
    apiMock.onPost('/likes/user-1').reply(200, { is_mutual: false });
    apiMock.onDelete('/likes/user-1').reply(200, { status: 'unliked' });
    apiMock.onPost('/likes/user-1/pass').reply(200, { status: 'passed' });
    apiMock.onDelete('/likes/user-1/pass').reply(200, { status: 'unpassed' });
    apiMock.onPost('/likes/user-1/unmatch').reply(200, { status: 'unmatched' });

    await expect(likesService.getLikeStatus('user-1')).resolves.toEqual({ i_liked: true });
    await expect(likesService.likeUser('user-1')).resolves.toEqual({ is_mutual: false });
    await expect(likesService.unlikeUser('user-1')).resolves.toEqual({ status: 'unliked' });
    await expect(likesService.passUser('user-1')).resolves.toEqual({ status: 'passed' });
    await expect(likesService.undoPass('user-1')).resolves.toEqual({ status: 'unpassed' });
    await expect(likesService.unmatch('user-1')).resolves.toEqual({ status: 'unmatched' });
  });
});
