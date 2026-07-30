import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '@/services';

export const NOTIFICATION_KEYS = {
  all: ['notifications'] as const,
  list: (params?: unknown) => ['notifications', 'list', params] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
};

export function useNotifications(params?: {
  limit?: number;
  offset?: number;
  unread_only?: boolean;
}) {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.list(params),
    queryFn: async () => {
      const response = await notificationService.getNotifications(params);
      return response.data;
    },
  });
}

export function useNotificationUnreadCount() {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.unreadCount,
    queryFn: async () => {
      const response = await notificationService.getUnreadCount();
      return response.data.unread_count;
    },
    staleTime: 30 * 1000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
  });
}
