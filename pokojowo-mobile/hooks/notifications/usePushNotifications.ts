import { useCallback, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';
import { registerForPushNotifications, handleNotificationResponse } from '@/lib/notifications';
import { userService } from '@/services';
import useAuthStore from '@/stores/authStore';
import { NOTIFICATION_KEYS } from './useNotifications';
import { pushNotificationsEnabled } from '@/lib/pushPreferences';

/**
 * Registers for Expo push notifications after auth, syncs the token to the
 * backend, and wires foreground + tap listeners. Safe on simulators (no-op).
 */
export function usePushNotifications() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const registered = useRef(false);
  const syncToken = useCallback(async (token: string | null | undefined) => {
    if (!token) return;
    try {
      await userService.updatePushToken(token);
    } catch {
      // Permission and token acquisition still work when an older backend is deployed.
      console.log('Push token not persisted');
    }
  }, []);

  // Register + sync token once authenticated (respecting push preference).
  useEffect(() => {
    if (!isAuthenticated) {
      registered.current = false;
      return;
    }
    if (registered.current || !pushNotificationsEnabled(user?.notification_preferences)) return;

    registered.current = true;
    (async () => {
      const token = await registerForPushNotifications();
      if (!token) return;
      await syncToken(token);
    })();

    // Expo can rotate a token while the app is installed; keep the backend current.
    const tokenSubscription = Notifications.addPushTokenListener(({ data }) => {
      void syncToken(data);
    });
    return () => tokenSubscription.remove();
  }, [isAuthenticated, syncToken, user?.notification_preferences]);

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
