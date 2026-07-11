import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MailWarning } from 'lucide-react-native';
import useAuthStore from '@/stores/authStore';
import { authService } from '@/services/auth.service';

/**
 * Banner shown while the user's email is unverified. Interactions
 * (like/message/create listing) are blocked server-side until verified.
 */
export default function VerifyEmailBanner() {
  const { t } = useTranslation('auth');
  const { user } = useAuthStore();
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sent' | 'cooldown'>('idle');

  const isVerified = (user as any)?.isVerified ?? (user as any)?.is_verified;
  if (!user || isVerified !== false) return null;

  const resend = async () => {
    if (!user.email) return;
    setSending(true);
    try {
      await authService.resendVerification(user.email);
      setStatus('sent');
    } catch (error: any) {
      setStatus(error?.response?.status === 429 ? 'cooldown' : 'idle');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: '#fef3c7' }}>
    <View className="flex-row items-center gap-2 bg-amber-100 border-b border-amber-300 px-4 py-2">
      <MailWarning size={16} color="#92400e" />
      <Text className="flex-1 text-xs text-amber-900">
        {status === 'sent'
          ? t('verifyBanner.sentTitle', 'Verification email sent')
          : t('verifyBanner.message', 'Verify your email to like, message and post listings.')}
      </Text>
      <TouchableOpacity
        onPress={resend}
        disabled={sending || status === 'cooldown'}
        className="px-3 py-1 rounded-full border border-amber-400"
      >
        {sending ? (
          <ActivityIndicator size="small" color="#92400e" />
        ) : (
          <Text className="text-xs font-medium text-amber-900">
            {status === 'cooldown'
              ? t('verifyBanner.tryLater', 'Try later')
              : t('verifyBanner.resend', 'Resend')}
          </Text>
        )}
      </TouchableOpacity>
    </View>
    </SafeAreaView>
  );
}
