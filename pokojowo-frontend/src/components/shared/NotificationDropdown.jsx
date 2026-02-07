import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getSocket, connectSocket } from '@/lib/socket';
import { formatRelativeTime } from '@/lib/utils';

export default function NotificationDropdown() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  // Listen for notifications from socket
  useEffect(() => {
    const socket = getSocket() || connectSocket();
    if (!socket) return;

    const handleNotification = (data) => {
      console.log('NotificationDropdown: received', data);
      if (data.type === 'new_message') {
        const newNotification = {
          id: data.messageId || Date.now().toString(),
          type: 'new_message',
          chatId: data.chatId,
          senderId: data.senderId,
          preview: data.preview,
          createdAt: new Date().toISOString(),
          read: false,
        };
        setNotifications((prev) => {
          // Prevent duplicates
          if (prev.some((n) => n.id === newNotification.id)) {
            return prev;
          }
          // Keep max 20 notifications
          return [newNotification, ...prev].slice(0, 20);
        });
      }
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = (notification) => {
    // Mark as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
    );
    // Navigate to chat
    if (notification.chatId) {
      navigate(`/chat/${notification.chatId}`);
    }
    setIsOpen(false);
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
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex items-start gap-3 p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                    !notification.read ? 'bg-blue-50/50 dark:bg-blue-950/30' : ''
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                      !notification.read
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${
                        !notification.read
                          ? 'font-medium text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {t('notifications.newMessage')}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {notification.preview}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      {formatRelativeTime(notification.createdAt)}
                    </p>
                  </div>
                  {!notification.read && (
                    <span className="flex-shrink-0 w-2 h-2 mt-2 bg-blue-500 rounded-full" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
