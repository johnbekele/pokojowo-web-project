import { Redirect, Slot } from 'expo-router';
import { View } from 'react-native';
import useAuthStore from '@/stores/authStore';
import VerifyEmailBanner from '@/components/shared/VerifyEmailBanner';
import OfflineBanner from '@/components/shared/OfflineBanner';
import TabBar from '@/components/shared/TabBar';
import BiometricGate from '@/components/shared/BiometricGate';
import useNotificationSocket from '@/hooks/notifications/useNotificationSocket';
import useChatOutboxSync from '@/hooks/chat/useChatOutboxSync';
import usePushNotifications from '@/hooks/notifications/usePushNotifications';

export default function AppLayout() {
  const { isAuthenticated } = useAuthStore();
  useNotificationSocket();
  usePushNotifications();
  useChatOutboxSync();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <BiometricGate>
      <View className="flex-1 bg-bg">
        <VerifyEmailBanner />
        <OfflineBanner />
        <View className="flex-1">
          <Slot />
        </View>
        <TabBar />
      </View>
    </BiometricGate>
  );
}
