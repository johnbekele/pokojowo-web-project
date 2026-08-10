import { useMemo } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail } from 'lucide-react-native';

import { Button, Input } from '@/components/ui';
import AuthScaffold from '@/components/feature/auth/AuthScaffold';
import AuthStatusView from '@/components/feature/auth/AuthStatusView';
import { useForgotPassword } from '@/hooks/auth/useAuth';
import useTheme from '@/hooks/useTheme';
import useUIStore from '@/stores/uiStore';

type ForgotPasswordFormData = { email: string };

export default function ForgotPasswordScreen() {
  const { t } = useTranslation('auth');
  const { colors } = useTheme();
  const showToast = useUIStore((s) => s.showToast);
  const forgotPasswordMutation = useForgotPassword();
  const forgotPasswordSchema = useMemo(
    () => z.object({ email: z.string().email(t('validation.email')) }),
    [t]
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await forgotPasswordMutation.mutateAsync(data.email);
    } catch {
      showToast({ type: 'error', message: t('forgotPassword.error.generic') });
    }
  };

  if (forgotPasswordMutation.isSuccess) {
    return (
      <AuthStatusView
        tone="success"
        title={t('forgotPassword.success.title')}
        message={t('forgotPassword.success.message')}
        note={getValues('email')}
        primaryAction={{
          label: t('forgotPassword.backToLogin'),
          onPress: () => router.replace('/(auth)/login'),
        }}
      />
    );
  }

  return (
    <AuthScaffold
      showBrand={false}
      title={t('forgotPassword.title')}
      subtitle={t('forgotPassword.subtitle')}
      onBack={() => router.replace('/(auth)/login')}
    >
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label={t('forgotPassword.email')}
            placeholder={t('forgotPassword.emailPlaceholder')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.email?.message}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            leftIcon={<Mail size={20} color={colors.muted} />}
          />
        )}
      />

      <Button onPress={handleSubmit(onSubmit)} loading={forgotPasswordMutation.isPending} fullWidth>
        {t('forgotPassword.submit')}
      </Button>

      {forgotPasswordMutation.isError && (
        <Text className="text-danger text-center mt-4">
          {t('forgotPassword.error.emailNotFound')}
        </Text>
      )}
    </AuthScaffold>
  );
}
