import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';

import { Button } from '@/components/ui';
import { useVerifyEmail } from '@/hooks/auth/useAuth';
import { COLORS } from '@/lib/constants';

type VerificationStatus = 'loading' | 'success' | 'error' | 'invalid';

export default function VerifyEmailScreen() {
  const { t } = useTranslation('auth');
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const verifyEmailMutation = useVerifyEmail();

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('invalid');
        return;
      }

      try {
        await verifyEmailMutation.mutateAsync(token);
        setStatus('success');
      } catch (error: any) {
        setStatus('error');
        setErrorMessage(
          error.response?.data?.detail ||
            t('verifyEmail.error.failed', 'Email verification failed')
        );
      }
    };

    verify();
  }, [token]);

  // Invalid or missing token
  if (status === 'invalid') {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 rounded-full bg-amber-100 items-center justify-center mb-6">
            <AlertCircle size={48} color={COLORS.warning} />
          </View>
          <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
            {t('verifyEmail.invalid.title', 'Invalid Link')}
          </Text>
          <Text className="text-gray-500 text-center mb-8">
            {t(
              'verifyEmail.invalid.message',
              'This verification link is invalid or has expired.'
            )}
          </Text>
          <Button
            variant="primary"
            onPress={() => router.replace('/(auth)/login')}
            fullWidth
          >
            {t('verifyEmail.backToLogin', 'Go to Login')}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // Loading state
  if (status === 'loading') {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-3xl font-bold text-primary-600 text-center mb-8">
            Pokojowo
          </Text>
          <ActivityIndicator size="large" color={COLORS.primary[600]} />
          <Text className="text-gray-500 text-center mt-4">
            {t('verifyEmail.verifying', 'Verifying your email...')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-6">
            <CheckCircle size={48} color={COLORS.success} />
          </View>
          <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
            {t('verifyEmail.success.title', 'Email Verified!')}
          </Text>
          <Text className="text-gray-500 text-center mb-8">
            {t(
              'verifyEmail.success.message',
              'Your email has been verified successfully. You can now log in to your account.'
            )}
          </Text>
          <Button
            variant="primary"
            onPress={() => router.replace('/(auth)/login')}
            fullWidth
          >
            {t('verifyEmail.continueToLogin', 'Continue to Login')}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-20 h-20 rounded-full bg-red-100 items-center justify-center mb-6">
          <XCircle size={48} color={COLORS.error} />
        </View>
        <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
          {t('verifyEmail.error.title', 'Verification Failed')}
        </Text>
        <Text className="text-gray-500 text-center mb-8">
          {errorMessage ||
            t(
              'verifyEmail.error.message',
              'We could not verify your email. The link may have expired.'
            )}
        </Text>
        <Button
          variant="primary"
          onPress={() => router.replace('/(auth)/login')}
          fullWidth
          className="mb-3"
        >
          {t('verifyEmail.backToLogin', 'Go to Login')}
        </Button>
        <Button
          variant="outline"
          onPress={() => router.replace('/(auth)/signup')}
          fullWidth
        >
          {t('verifyEmail.tryAgain', 'Sign Up Again')}
        </Button>
      </View>
    </SafeAreaView>
  );
}
