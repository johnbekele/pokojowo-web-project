import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import api from '@/lib/api';
import { useIsSaved, useSaveMatch } from './useFavorites';

describe('favorites hooks', () => {
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

  it('shares one saved-list request across status consumers', async () => {
    apiMock.onGet('/favorites/').reply(200, {
      saved_matches: [{ user_id: 'user-1' }],
      total: 1,
    });

    const { result } = renderHook(() => useIsSaved('user-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.isSaved).toBe(true);
    expect(apiMock.history.get).toHaveLength(1);
  });

  it('uses a mutation and invalidates the saved-list query', async () => {
    apiMock.onPost('/favorites/user-2').reply(200, { status: 'saved' });

    const { result } = renderHook(() => useSaveMatch(), { wrapper });
    await result.current.mutateAsync({ userId: 'user-2' });

    expect(apiMock.history.post).toHaveLength(1);
    expect(queryClient.getQueryData(['favorites', 'check', 'user-2'])).toBe(true);
  });
});
