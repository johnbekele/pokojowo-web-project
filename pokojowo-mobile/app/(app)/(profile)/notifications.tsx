import { View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCheck } from 'lucide-react-native';

import { Header, EmptyState, SkeletonCard } from '@/components/ui';
import NotificationRow from '@/components/feature/notifications/NotificationRow';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from '@/hooks/notifications/useNotifications';
import { routeForNotification } from '@/lib/notificationRouting';
import useTheme from '@/hooks/useTheme';
import type { AppNotification } from '@/types/notification.types';

export default function NotificationsScreen() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { colors } = useTheme();

  const { data, isLoading, isError, isRefetching, refetch } = useNotifications({ limit: 50 });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  const notifications = data?.notifications ?? [];
  const hasUnread = (data?.unread_count ?? 0) > 0;

  const handlePress = (n: AppNotification) => {
    if (!n.is_read) markRead.mutate(n.id);
    routeForNotification(router, n);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View className="pt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      );
    }

    if (isError) {
      return (
        <EmptyState
          icon={<Bell size={48} color={colors.muted} />}
          title={t('notifications.loadError')}
          action={{ label: t('actions.retry'), onPress: () => refetch() }}
        />
      );
    }

    if (notifications.length === 0) {
      return (
        <EmptyState
          icon={<Bell size={48} color={colors.muted} />}
          title={t('notifications.empty')}
          description={t('notifications.emptyDescription')}
        />
      );
    }

    return (
      <FlashList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationRow
            notification={item}
            onPress={handlePress}
            onDelete={(id) => deleteNotification.mutate(id)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />
        }
      />
    );
  };

  return (
    <View className="flex-1 bg-bg">
      <Header
        title={t('notifications.title')}
        showBack
        right={
          hasUnread ? (
            <TouchableOpacity
              onPress={() => markAllRead.mutate()}
              className="flex-row items-center gap-1"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <CheckCheck size={18} color={colors.brand} />
              <Text className="text-brand text-sm font-medium">
                {t('notifications.markAllRead')}
              </Text>
            </TouchableOpacity>
          ) : undefined
        }
      />
      <View className="flex-1">{renderContent()}</View>
    </View>
  );
}
