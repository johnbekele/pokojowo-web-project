import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react-native';
import useNetworkStatus from '@/hooks/useNetworkStatus';

/**
 * Shown while the device has no usable connection.
 *
 * Sits in the layout flow rather than floating, so it cannot cover a toast or
 * the header, and so it is impossible to miss while it applies.
 */
export default function OfflineBanner() {
  const { t } = useTranslation('common');
  const { isOffline } = useNetworkStatus();

  if (!isOffline) return null;

  return (
    <View className="flex-row items-center gap-2 bg-slate-800 px-4 py-2">
      <WifiOff size={14} color="#e2e8f0" />
      <Text className="flex-1 text-xs text-slate-200">
        {t('offline.message', "You're offline. Some actions will wait until you reconnect.")}
      </Text>
    </View>
  );
}
