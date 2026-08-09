import { useEffect, useRef } from 'react';
import Providers from './providers';
import AppRouter from './router';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import RouteErrorBoundary from '@/components/shared/RouteErrorBoundary';
import useAuthStore from '@/stores/authStore';
import { useNotificationListener } from '@/hooks/useNotificationListener';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { connectChatSocket, disconnectChatSocket } from '@/lib/chatSocket';
import SeoHead from '@/components/shared/SeoHead';

/**
 * Main application component
 */
function AppContent() {
  const { fetchUser, isAuthenticated, token } = useAuthStore();
  const validatedSession = useRef(false);

  // Validate the stored session once per load. This used to be guarded by
  // `!isAuthenticated`, but that flag is persisted alongside the token, so on
  // every reload it was already true and the check never ran: a revoked or
  // expired token produced a signed-in-looking app where each request failed
  // on its own. fetchUser clears the session on rejection, which sends
  // ProtectedRoute to login once instead.
  useEffect(() => {
    if (validatedSession.current || !token) return;
    validatedSession.current = true;
    fetchUser();
  }, [token, fetchUser]);

  // Initialize socket when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      connectSocket(token);
      connectChatSocket(token);
    }
    return () => {
      // Cleanup on unmount only if logging out
    };
  }, [isAuthenticated, token]);

  // Listen for real-time notifications
  useNotificationListener();

  // Catches routes that render outside PageLayout — the auth pages and the
  // listing editor — including a lazy chunk that fails to load, since that
  // rejection surfaces as a render error above the Suspense boundary.
  return (
    <RouteErrorBoundary fullPage>
      <SeoHead />
      <AppRouter />
    </RouteErrorBoundary>
  );
}

export default function App() {
  return (
    <Providers>
      {/* Last resort. The router and PageLayout have their own boundaries that
          keep more of the app alive; this one catches what happens outside
          them, so nothing reaches the user as a blank page. */}
      <ErrorBoundary fullPage>
        <AppContent />
      </ErrorBoundary>
    </Providers>
  );
}
