import { useState } from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock } from 'lucide-react-native';

import { Button, Input } from '@/components/ui';
import AuthScaffold from '@/components/feature/auth/AuthScaffold';
import AuthStatusView from '@/components/feature/auth/AuthStatusView';
import { useResetPassword } from '@/hooks/auth/useAuth';
import useTheme from '@/hooks/useTheme';

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordScreen() {
  const { t } = useTranslation('auth');
  const { colors } = useTheme();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [isSuccess, setIsSuccess] = useState(false);
  const resetPasswordMutation = useResetPassword();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return;
    try {
      await resetPasswordMutation.mutateAsync({ token, password: data.password });
      setIsSuccess(true);
      setTimeout(() => router.replace('/(auth)/login'), 2000);
    } catch {
      // handled by mutation state
    }
  };

  if (!token) {
    return (
      <AuthStatusView
        tone="error"
        title={t('resetPassword.invalid.title', 'Invalid Link')}
        message={t('resetPassword.invalid.message', 'This password reset link is invalid or has expired.')}
        primaryAction={{
          label: t('resetPassword.invalid.requestNew', 'Request New Link'),
          onPress: () => router.replace('/(auth)/forgot-password'),
        }}
      />
    );
  }

  if (isSuccess) {
    return (
      <AuthStatusView
        tone="success"
        title={t('resetPassword.success.title', 'Password Reset!')}
        message={t('resetPassword.success.message', 'Your password has been reset successfully.')}
        note={t('resetPassword.success.redirecting', 'Redirecting to login...')}
      />
    );
  }

  return (
    <AuthScaffold
      title={t('resetPassword.title', 'Reset Your Password')}
      subtitle={t('resetPassword.subtitle', 'Enter your new password below')}
    >
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label={t('resetPassword.password', 'New Password')}
            placeholder={t('resetPassword.passwordPlaceholder', 'Enter new password')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.password?.message}
            secureTextEntry
            autoCapitalize="none"
            leftIcon={<Lock size={20} color={colors.muted} />}
          />
        )}
      />

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label={t('resetPassword.confirmPassword', 'Confirm Password')}
            placeholder={t('resetPassword.confirmPasswordPlaceholder', 'Confirm new password')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.confirmPassword?.message}
            secureTextEntry
            autoCapitalize="none"
            leftIcon={<Lock size={20} color={colors.muted} />}
          />
        )}
      />

      {resetPasswordMutation.isError && (
        <View className="bg-danger/10 border border-danger/30 rounded-lg p-3 mb-4">
          <Text className="text-danger text-center">
            {t('resetPassword.error.failed', 'Failed to reset password. The link may have expired.')}
          </Text>
        </View>
      )}

      <Button onPress={handleSubmit(onSubmit)} loading={resetPasswordMutation.isPending} fullWidth>
        {t('resetPassword.submit', 'Reset Password')}
      </Button>

      <Button variant="ghost" onPress={() => router.replace('/(auth)/login')} fullWidth className="mt-2">
        {t('resetPassword.backToLogin', 'Back to Sign In')}
      </Button>
    </AuthScaffold>
  );
}
