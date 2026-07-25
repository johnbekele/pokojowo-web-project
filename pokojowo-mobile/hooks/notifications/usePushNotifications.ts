import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';
import { registerForPushNotifications, handleNotificationResponse } from '@/lib/notifications';
import { userService } from '@/services';
import useAuthStore from '@/stores/authStore';
import { NOTIFICATION_KEYS } from './useNotifications';

/**
 * Registers for Expo push notifications after auth, syncs the token to the
 * backend, and wires foreground + tap listeners. Safe on simulators (no-op).
 */
export function usePushNotifications() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const registered = useRef(false);

  // Register + sync token once authenticated (respecting push preference).
  useEffect(() => {
    if (!isAuthenticated || registered.current) return;
    const prefs = user?.notification_preferences;
    const pushEnabled =
      !prefs ||
      prefs.push_new_message !== false ||
      prefs.push_new_match !== false ||
      prefs.push_listing_interest !== false;
    if (!pushEnabled) return;

    registered.current = true;
    (async () => {
      const token = await registerForPushNotifications();
      if (!token) return;
      try {
        await userService.updatePushToken(token);
      } catch {
        // Backend endpoint may not exist yet; token is cached locally.
        console.log('Push token not persisted (backend endpoint pending)');
      }
    })();
  }, [isAuthenticated, user?.notification_preferences]);

  // Foreground + tap listeners.
  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    });
    const responseSub = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    // Handle cold-start from a tapped notification.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleNotificationResponse(response);
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [queryClient]);
}

export default usePushNotifications;
