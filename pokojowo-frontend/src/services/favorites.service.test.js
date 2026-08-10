import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import api from '@/lib/api';
import favoritesService from './favorites.service';

describe('favorites service', () => {
  let apiMock;

  beforeEach(() => {
    apiMock = new MockAdapter(api);
  });

  afterEach(() => {
    apiMock.restore();
  });

  it('loads saved matches with pagination', async () => {
    apiMock.onGet('/favorites/').reply((config) => {
      expect(config.params).toEqual({ limit: 10, offset: 20 });
      return [200, { saved_matches: [], total: 0 }];
    });

    await expect(
      favoritesService.getSavedMatches({ limit: 10, offset: 20 }),
    ).resolves.toEqual({ saved_matches: [], total: 0 });
  });

  it('sends save and remove mutations through the service', async () => {
    apiMock.onPost('/favorites/user-1').reply(200, { status: 'saved' });
    apiMock.onDelete('/favorites/user-1').reply(200, { status: 'removed' });

    await expect(favoritesService.saveMatch('user-1')).resolves.toEqual({
      status: 'saved',
    });
    await expect(favoritesService.removeSaved('user-1')).resolves.toEqual({
      status: 'removed',
    });
  });

  it('maps the saved-status and count responses', async () => {
    apiMock.onGet('/favorites/check/user-1').reply(200, { is_saved: true });
    apiMock.onGet('/favorites/count').reply(200, { count: 3 });

    await expect(favoritesService.checkIfSaved('user-1')).resolves.toBe(true);
    await expect(favoritesService.getSavedCount()).resolves.toBe(3);
  });
});
