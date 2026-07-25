import { useChats } from '@/hooks/chat/useChat';
import { useNotificationUnreadCount } from '@/hooks/notifications/useNotifications';

interface TabBadges {
  chatUnread: number;
  notificationUnread: number;
}

/**
 * Aggregates the unread counters surfaced on the tab bar / headers:
 * - chat: sum of per-room unreadCount from the chat list
 * - notifications: unread-count endpoint (see hooks/notifications)
 */
export function useTabBadges(): TabBadges {
  const { data: chats } = useChats();
  const { data: notificationUnread } = useNotificationUnreadCount();

  const chatUnread = Array.isArray(chats)
    ? chats.reduce((sum, chat) => sum + (chat?.unreadCount ?? 0), 0)
    : 0;

  return {
    chatUnread,
    notificationUnread: notificationUnread ?? 0,
  };
}

export default useTabBadges;
