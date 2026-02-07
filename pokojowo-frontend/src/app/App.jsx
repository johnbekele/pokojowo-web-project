import { useEffect } from 'react';
import Providers from './providers';
import AppRouter from './router';
import useAuthStore from '@/stores/authStore';
import { useNotificationListener } from '@/hooks/useNotificationListener';
import { connectSocket, disconnectSocket } from '@/lib/socket';

/**
 * Main application component
 */
function AppContent() {
  const { fetchUser, isAuthenticated, token } = useAuthStore();

  // Fetch user on mount if token exists
  useEffect(() => {
    if (token && !isAuthenticated) {
      fetchUser();
    }
  }, [token, isAuthenticated, fetchUser]);

  // Initialize socket when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      connectSocket(token);
    }
    return () => {
      // Cleanup on unmount only if logging out
    };
  }, [isAuthenticated, token]);

  // Listen for real-time notifications
  useNotificationListener();

  return <AppRouter />;
}

export default function App() {
  return (
    <Providers>
      <AppContent />
    </Providers>
  );
}
