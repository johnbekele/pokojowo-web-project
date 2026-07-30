import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import AuthStatusView from '@/components/feature/auth/AuthStatusView';
import { useVerifyEmail } from '@/hooks/auth/useAuth';
import useTheme from '@/hooks/useTheme';

type VerificationStatus = 'loading' | 'success' | 'error' | 'invalid';

export default function VerifyEmailScreen() {
  const { t } = useTranslation('auth');
  const { colors } = useTheme();
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
      } catch (error) {
        setStatus('error');
        const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail;
        setErrorMessage(detail || t('verifyEmail.error.failed', 'Email verification failed'));
      }
    };
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (status === 'loading') {
    return (
      <SafeAreaView className="flex-1 bg-bg">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-3xl font-extrabold text-brand text-center mb-8">Pokojowo</Text>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text className="text-muted text-center mt-4">
            {t('verifyEmail.verifying', 'Verifying your email...')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'invalid') {
    return (
      <AuthStatusView
        tone="warning"
        title={t('verifyEmail.invalid.title', 'Invalid Link')}
        message={t('verifyEmail.invalid.message', 'This verification link is invalid or has expired.')}
        primaryAction={{
          label: t('verifyEmail.backToLogin', 'Go to Login'),
          onPress: () => router.replace('/(auth)/login'),
        }}
      />
    );
  }

  if (status === 'success') {
    return (
      <AuthStatusView
        tone="success"
        title={t('verifyEmail.success.title', 'Email Verified!')}
        message={t(
          'verifyEmail.success.message',
          'Your email has been verified successfully. You can now log in to your account.'
        )}
        primaryAction={{
          label: t('verifyEmail.continueToLogin', 'Continue to Login'),
          onPress: () => router.replace('/(auth)/login'),
        }}
      />
    );
  }

  return (
    <AuthStatusView
      tone="error"
      title={t('verifyEmail.error.title', 'Verification Failed')}
      message={errorMessage || t('verifyEmail.error.message', 'We could not verify your email. The link may have expired.')}
      primaryAction={{
        label: t('verifyEmail.backToLogin', 'Go to Login'),
        onPress: () => router.replace('/(auth)/login'),
      }}
      secondaryAction={{
        label: t('verifyEmail.tryAgain', 'Sign Up Again'),
        onPress: () => router.replace('/(auth)/signup'),
      }}
    />
  );
}
