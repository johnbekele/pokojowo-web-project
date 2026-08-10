import { useMemo, useState } from 'react';
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
import useUIStore from '@/stores/uiStore';

type ResetPasswordFormData = { password: string; confirmPassword: string };

export default function ResetPasswordScreen() {
  const { t } = useTranslation('auth');
  const { colors } = useTheme();
  const showToast = useUIStore((s) => s.showToast);
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [isSuccess, setIsSuccess] = useState(false);
  const resetPasswordMutation = useResetPassword();
  const resetPasswordSchema = useMemo(
    () =>
      z
        .object({
          password: z.string().min(10, t('validation.passwordLength')),
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: t('validation.passwordMatch'),
          path: ['confirmPassword'],
        }),
    [t]
  );

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
      showToast({ type: 'error', message: t('resetPassword.error.invalidToken') });
    }
  };

  if (!token) {
    return (
      <AuthStatusView
        tone="error"
        title={t('resetPassword.error.invalidTitle')}
        message={t('resetPassword.error.invalidToken')}
        primaryAction={{
          label: t('resetPassword.error.requestNew'),
          onPress: () => router.replace('/(auth)/forgot-password'),
        }}
      />
    );
  }

  if (isSuccess) {
    return (
      <AuthStatusView
        tone="success"
        title={t('resetPassword.success.title')}
        message={t('resetPassword.success.message')}
        note={t('resetPassword.redirecting')}
      />
    );
  }

  return (
    <AuthScaffold
      title={t('resetPassword.title')}
      subtitle={t('resetPassword.subtitle')}
    >
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label={t('resetPassword.password')}
            placeholder={t('resetPassword.passwordPlaceholder')}
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

      <Text className="text-muted text-xs mb-4">
        {t('resetPassword.passwordRequirements')}
      </Text>

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label={t('resetPassword.confirmPassword')}
            placeholder={t('resetPassword.confirmPasswordPlaceholder')}
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
            {t('resetPassword.error.invalidToken')}
          </Text>
        </View>
      )}

      <Button onPress={handleSubmit(onSubmit)} loading={resetPasswordMutation.isPending} fullWidth>
        {t('resetPassword.submit')}
      </Button>

      <Button variant="ghost" onPress={() => router.replace('/(auth)/login')} fullWidth className="mt-2">
        {t('resetPassword.backToLogin')}
      </Button>
    </AuthScaffold>
  );
}
