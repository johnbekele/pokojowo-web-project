import { View, Text, TouchableOpacity } from 'react-native';
import { Heart, Users, MessageSquare, Search, Bell, Trash2, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { cn, formatRelativeTime } from '@/lib/utils';
import useTheme from '@/hooks/useTheme';
import type { AppNotification, NotificationType } from '@/types/notification.types';

const iconByType: Record<NotificationType, LucideIcon> = {
  new_like: Heart,
  mutual_match: Users,
  new_message: MessageSquare,
  saved_search_match: Search,
  system: Bell,
};

const titleKeyByType: Record<NotificationType, string> = {
  new_like: 'notifications.newLike',
  mutual_match: 'notifications.mutualMatch',
  new_message: 'notifications.newMessage',
  saved_search_match: 'notifications.savedSearchMatch',
  system: 'notifications.system',
};

interface NotificationRowProps {
  notification: AppNotification;
  onPress: (n: AppNotification) => void;
  onDelete: (id: string) => void;
}

export default function NotificationRow({ notification, onPress, onDelete }: NotificationRowProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const Icon = iconByType[notification.type] ?? Bell;
  const preview = notification.message || notification.data?.preview || notification.data?.savedSearchName;

  return (
    <TouchableOpacity
      onPress={() => onPress(notification)}
      activeOpacity={0.7}
      className={cn(
        'flex-row items-start gap-3 px-4 py-3 border-b border-border',
        notification.is_read ? 'bg-bg' : 'bg-surface'
      )}
    >
      <View className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 items-center justify-center">
        <Icon size={18} color={colors.brand} />
      </View>
      <View className="flex-1">
        <Text className="text-text font-semibold" numberOfLines={1}>
          {t(titleKeyByType[notification.type] ?? 'notifications.system')}
        </Text>
        {preview ? (
          <Text className="text-muted text-sm mt-0.5" numberOfLines={2}>
            {preview}
          </Text>
        ) : null}
        <Text className="text-muted text-xs mt-1">
          {formatRelativeTime(notification.created_at)}
        </Text>
      </View>
      {!notification.is_read && <View className="w-2.5 h-2.5 rounded-full bg-brand mt-1.5" />}
      <TouchableOpacity
        onPress={() => onDelete(notification.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        className="ml-1 p-1"
      >
        <Trash2 size={16} color={colors.muted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
