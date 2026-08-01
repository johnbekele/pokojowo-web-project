import { QueryClient } from '@tanstack/react-query';

/**
 * The app's single QueryClient.
 *
 * It lives here rather than inside providers.jsx so that non-React code can
 * reach it — the auth store has to empty the cache on logout, otherwise the
 * next person to sign in on a shared browser sees the previous user's data
 * until each query refetches.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export default queryClient;
