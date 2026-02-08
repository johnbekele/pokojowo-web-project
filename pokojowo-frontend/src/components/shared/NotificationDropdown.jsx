import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, MessageSquare, ThumbsUp, Handshake, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getSocket, connectSocket } from '@/lib/socket';
import { formatRelativeTime } from '@/lib/utils';
import useAuthStore from '@/stores/authStore';

export default function NotificationDropdown() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { isAuthenticated, token } = useAuthStore();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  // Listen for notifications from socket
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const socket = getSocket() || connectSocket(token);
    if (!socket) return;

    const handleNotification = (data) => {
      console.log('NotificationDropdown: received', data);

      let newNotification = null;

      switch (data.type) {
        case 'new_message':
          newNotification = {
            id: data.messageId || `msg-${Date.now()}`,
            type: 'new_message',
            chatId: data.chatId,
            senderId: data.senderId,
            preview: data.preview,
            createdAt: new Date().toISOString(),
            read: false,
          };
          break;

        case 'new_like':
          newNotification = {
            id: `like-${data.likerId}-${Date.now()}`,
            type: 'new_like',
            userId: data.likerId,
            userName: data.likerName,
            userPhoto: data.likerPhoto,
            message: data.message,
            createdAt: new Date().toISOString(),
            read: false,
          };
          break;

        case 'mutual_match':
          newNotification = {
            id: `match-${data.matchedUserId}-${Date.now()}`,
            type: 'mutual_match',
            userId: data.matchedUserId,
            userName: data.matchedUserName,
            userPhoto: data.matchedUserPhoto,
            message: data.message,
            createdAt: new Date().toISOString(),
            read: false,
          };
          break;

        default:
          console.log('Unknown notification type:', data.type);
          return;
      }

      if (newNotification) {
        setNotifications((prev) => {
          // Prevent duplicates based on similar notifications in last 5 seconds
          const isDuplicate = prev.some((n) => {
            if (n.type !== newNotification.type) return false;
            const timeDiff = new Date(newNotification.createdAt) - new Date(n.createdAt);
            if (timeDiff > 5000) return false; // More than 5 seconds apart

            if (n.type === 'new_like' || n.type === 'mutual_match') {
              return n.userId === newNotification.userId;
            }
            if (n.type === 'new_message') {
              return n.chatId === newNotification.chatId && n.preview === newNotification.preview;
            }
            return false;
          });

          if (isDuplicate) return prev;

          // Keep max 50 notifications
          return [newNotification, ...prev].slice(0, 50);
        });
      }
    };

    const handleConnect = () => {
      console.log('NotificationDropdown: Socket connected');
    };

    socket.on('notification', handleNotification);
    socket.on('connect', handleConnect);

    return () => {
      socket.off('notification', handleNotification);
      socket.off('connect', handleConnect);
    };
  }, [isAuthenticated, token]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = (notification) => {
    // Mark as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
    );

    // Navigate based on notification type
    switch (notification.type) {
      case 'new_message':
        if (notification.chatId) {
          navigate(`/chat/${notification.chatId}`);
        }
        break;

      case 'new_like':
      case 'mutual_match':
        // Navigate to user's match profile with details
        if (notification.userId) {
          navigate(`/matches/${notification.userId}`);
        }
        break;

      default:
        break;
    }

    setIsOpen(false);
  };

  // Get icon based on notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_message':
        return MessageSquare;
      case 'new_like':
        return ThumbsUp;
      case 'mutual_match':
        return Handshake;
      default:
        return Bell;
    }
  };

  // Get notification title based on type
  const getNotificationTitle = (notification) => {
    switch (notification.type) {
      case 'new_message':
        return t('notifications.newMessage', 'New message');
      case 'new_like':
        return t('notifications.newLike', 'Someone is interested!');
      case 'mutual_match':
        return t('notifications.mutualMatch', "You're connected!");
      default:
        return t('notifications.notification', 'Notification');
    }
  };

  // Get notification preview text
  const getNotificationPreview = (notification) => {
    switch (notification.type) {
      case 'new_message':
        return notification.preview;
      case 'new_like':
        return notification.message || `${notification.userName} is interested in being your flatmate`;
      case 'mutual_match':
        return notification.message || `You and ${notification.userName} are both interested!`;
      default:
        return '';
    }
  };

  // Get icon color based on type and read status
  const getIconStyles = (notification) => {
    if (!notification.read) {
      switch (notification.type) {
        case 'new_like':
          return 'bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400';
        case 'mutual_match':
          return 'bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-900/50 dark:to-emerald-900/50 text-teal-600 dark:text-teal-400';
        case 'new_message':
        default:
          return 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400';
      }
    }
    return 'bg-muted text-muted-foreground';
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-muted/50">
          <h3 className="font-semibold text-foreground">{t('notifications.title')}</h3>
          {notifications.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t('notifications.markAllRead')}
              </button>
              <button
                onClick={clearAll}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {t('notifications.clear')}
              </button>
            </div>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t('notifications.empty')}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                const bgClass = !notification.read
                  ? notification.type === 'new_like' || notification.type === 'mutual_match'
                    ? 'bg-teal-50/50 dark:bg-teal-950/20'
                    : 'bg-blue-50/50 dark:bg-blue-950/30'
                  : '';

                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`flex items-start gap-3 p-3 cursor-pointer transition-colors hover:bg-muted/50 ${bgClass}`}
                  >
                    <div
                      className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${getIconStyles(notification)}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm ${
                          !notification.read
                            ? 'font-medium text-foreground'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {getNotificationTitle(notification)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {getNotificationPreview(notification)}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.read && (
                      <span
                        className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${
                          notification.type === 'new_like' || notification.type === 'mutual_match'
                            ? 'bg-teal-500'
                            : 'bg-blue-500'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
