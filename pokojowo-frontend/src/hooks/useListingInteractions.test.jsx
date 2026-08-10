import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { renderHook, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import api from '@/lib/api';
import {
  listingInteractionKeys,
  useBatchInterestedUsers,
  useListingLike,
} from './useListingInteractions';

describe('listing interaction hooks', () => {
  let apiMock;
  let queryClient;

  beforeEach(() => {
    apiMock = new MockAdapter(api);
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  afterEach(() => {
    apiMock.restore();
    queryClient.clear();
  });

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('shares the liked-list request and updates the cache optimistically', async () => {
    apiMock
      .onGet('/listing-interactions/my-liked')
      .replyOnce(200, { likedListingIds: ['listing-1'], count: 1 })
      .onGet('/listing-interactions/my-liked')
      .reply(200, { likedListingIds: [], count: 0 });
    apiMock
      .onDelete('/listing-interactions/listing-1/like')
      .reply(200, { success: true });

    const { result } = renderHook(
      () => useListingLike('listing-1', { enabled: true }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isLiked).toBe(true);

    await act(async () => {
      await result.current.toggleLike();
    });

    await waitFor(() => expect(result.current.isLiked).toBe(false));
    expect(apiMock.history.get).toHaveLength(2);
    expect(apiMock.history.delete).toHaveLength(1);
    expect(queryClient.getQueryData(listingInteractionKeys.myLiked)).toEqual({
      likedListingIds: [],
      count: 0,
    });
  });

  it('rolls back a failed optimistic like', async () => {
    apiMock
      .onGet('/listing-interactions/my-liked')
      .reply(200, { likedListingIds: [], count: 0 });
    apiMock
      .onPost('/listing-interactions/listing-2/like')
      .reply(500, { detail: 'failed' });

    const { result } = renderHook(
      () => useListingLike('listing-2', { enabled: true }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await act(async () => {
      await expect(result.current.toggleLike()).rejects.toBeDefined();
    });
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(result.current.isLiked).toBe(false);
  });

  it('removes an optimistic like when the first request fails before a read', async () => {
    apiMock
      .onPost('/listing-interactions/listing-3/like')
      .reply(500, { detail: 'failed' });

    const { result } = renderHook(
      () => useListingLike('listing-3', { enabled: true }),
      { wrapper },
    );

    await act(async () => {
      await expect(result.current.toggleLike()).rejects.toBeDefined();
    });

    expect(result.current.isLiked).toBe(false);
    expect(queryClient.getQueryData(listingInteractionKeys.myLiked)).toBeUndefined();
  });

  it('deduplicates listing IDs for a single interested-user query', async () => {
    apiMock
      .onPost('/listing-interactions/batch-interested-users')
      .reply((config) => {
        expect(JSON.parse(config.data).listingIds).toEqual(['listing-1', 'listing-2']);
        return [200, { results: { 'listing-1': [{ userId: 'user-1' }] } }];
      });

    const { result } = renderHook(
      () =>
        useBatchInterestedUsers(
          ['listing-1', 'listing-1', 'listing-2'],
          { minCompatibility: 70, limitPerListing: 3 },
          { enabled: true },
        ),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.usersByListing['listing-1']).toHaveLength(1);
    expect(apiMock.history.post).toHaveLength(1);
  });
});
