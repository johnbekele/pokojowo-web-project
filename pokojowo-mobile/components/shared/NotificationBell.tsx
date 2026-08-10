import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import useTheme from '@/hooks/useTheme';
import { useNotificationUnreadCount } from '@/hooks/notifications/useNotifications';

interface NotificationBellProps {
  color?: string;
  size?: number;
}

export default function NotificationBell({ color, size = 24 }: NotificationBellProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  const { data: unread } = useNotificationUnreadCount();
  const count = unread ?? 0;

  return (
    <TouchableOpacity
      onPress={() => router.push('/(app)/(profile)/notifications')}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel={t('accessibility.notifications')}
    >
      <View>
        <Bell color={color ?? colors.text} size={size} />
        {count > 0 && (
          <View className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-danger items-center justify-center">
            <Text className="text-white text-[10px] font-bold">
              {count > 9 ? '9+' : count}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
