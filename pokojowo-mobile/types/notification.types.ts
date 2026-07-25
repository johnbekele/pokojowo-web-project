export type NotificationType =
  | 'new_like'
  | 'mutual_match'
  | 'new_message'
  | 'saved_search_match'
  | 'system';

export interface NotificationData {
  likerId?: string;
  likerName?: string;
  likerPhoto?: string;
  matchedUserId?: string;
  matchedUserName?: string;
  matchedUserPhoto?: string;
  chatId?: string;
  savedSearchId?: string;
  savedSearchName?: string;
  preview?: string;
  [key: string]: unknown;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  message?: string;
  data?: NotificationData;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: AppNotification[];
  total: number;
  unread_count: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}
