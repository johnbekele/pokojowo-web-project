import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import useUIStore from '@/stores/uiStore';
import { NOTIFICATION_KEYS } from './useNotifications';

/**
 * Subscribes to the authed socket's `notification` event and keeps the
 * notification queries fresh. Mount once inside the authenticated area.
 * Reuses the existing socket connection from lib/socket.
 */
export function useNotificationSocket() {
  const queryClient = useQueryClient();
  const showToast = useUIStore((s) => s.showToast);

  useEffect(() => {
    let attached = false;

    const handler = (data: { type?: string; message?: string } = {}) => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
      if (data.message) {
        showToast({ type: 'info', message: data.message });
      }
    };

    const attach = () => {
      const socket = getSocket();
      if (socket && !attached) {
        socket.on('notification', handler);
        attached = true;
      }
      return attached;
    };

    // Socket may connect slightly after mount (after auth init); retry briefly.
    if (!attach()) {
      const interval = setInterval(() => {
        if (attach()) clearInterval(interval);
      }, 1000);
      return () => {
        clearInterval(interval);
        getSocket()?.off('notification', handler);
      };
    }

    return () => {
      getSocket()?.off('notification', handler);
    };
  }, [queryClient, showToast]);
}

export default useNotificationSocket;
