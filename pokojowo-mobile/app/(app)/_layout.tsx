import { Redirect, Slot } from 'expo-router';
import { View } from 'react-native';
import useAuthStore from '@/stores/authStore';
import VerifyEmailBanner from '@/components/shared/VerifyEmailBanner';
import TabBar from '@/components/shared/TabBar';
import useNotificationSocket from '@/hooks/notifications/useNotificationSocket';
import usePushNotifications from '@/hooks/notifications/usePushNotifications';

export default function AppLayout() {
  const { isAuthenticated } = useAuthStore();
  useNotificationSocket();
  usePushNotifications();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <View className="flex-1 bg-bg">
      <VerifyEmailBanner />
      <View className="flex-1">
        <Slot />
      </View>
      <TabBar />
    </View>
  );
}
