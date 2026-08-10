import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import api from '@/lib/api';
import { useLikeStatus, useLikeUser, useLikesSent } from './useLikes';

describe('likes hooks', () => {
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

  it('shares the likes query cache with status consumers', async () => {
    apiMock.onGet('/likes/sent').reply(200, { likes: [{ liked_user_id: 'user-1' }] });
    const { result } = renderHook(() => useLikesSent(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data.likes).toHaveLength(1);
    expect(apiMock.history.get).toHaveLength(1);
  });

  it('updates cached status after liking a user', async () => {
    apiMock.onGet('/likes/check/user-1').reply(200, {
      i_liked: false,
      they_liked: true,
      is_mutual: false,
    });
    apiMock.onPost('/likes/user-1').reply(200, { is_mutual: true });

    const status = renderHook(() => useLikeStatus('user-1'), { wrapper });
    await waitFor(() => expect(status.result.current.isSuccess).toBe(true));

    const mutation = renderHook(() => useLikeUser(), { wrapper });
    await mutation.result.current.mutateAsync('user-1');

    expect(queryClient.getQueryData(['likes', 'status', 'user-1'])).toMatchObject({
      i_liked: true,
      is_mutual: true,
      they_liked: true,
    });
  });
});
