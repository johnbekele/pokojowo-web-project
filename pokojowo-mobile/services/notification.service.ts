import api from '@/lib/api';
import type {
  NotificationListResponse,
  UnreadCountResponse,
} from '@/types/notification.types';

export const notificationService = {
  getNotifications: (params?: { limit?: number; offset?: number; unread_only?: boolean }) =>
    api.get<NotificationListResponse>('/notifications/', { params }),

  getUnreadCount: () => api.get<UnreadCountResponse>('/notifications/unread-count'),

  markRead: (notificationId: string) =>
    api.post<{ status: string; message: string }>(`/notifications/${notificationId}/read`),

  markAllRead: () =>
    api.post<{ status: string; marked_count: number }>('/notifications/read-all'),

  remove: (notificationId: string) =>
    api.delete<{ status: string; message: string }>(`/notifications/${notificationId}`),
};

export default notificationService;
