import { View, Text } from 'react-native';
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

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const { t } = useTranslation('auth');
  const { colors } = useTheme();
  const forgotPasswordMutation = useForgotPassword();

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
      // handled by mutation state
    }
  };

  if (forgotPasswordMutation.isSuccess) {
    return (
      <AuthStatusView
        tone="success"
        title={t('forgotPassword.success.title', 'Check Your Email')}
        message={t(
          'forgotPassword.success.message',
          "We've sent password reset instructions to your email."
        )}
        note={getValues('email')}
        primaryAction={{
          label: t('forgotPassword.backToLogin', 'Back to Sign In'),
          onPress: () => router.replace('/(auth)/login'),
        }}
      />
    );
  }

  return (
    <AuthScaffold
      showBrand={false}
      title={t('forgotPassword.title', 'Forgot Password?')}
      subtitle={t('forgotPassword.subtitle', "No worries, we'll send you reset instructions")}
      onBack={() => router.replace('/(auth)/login')}
    >
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label={t('forgotPassword.email', 'Email')}
            placeholder={t('forgotPassword.emailPlaceholder', 'Enter your email')}
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
        {t('forgotPassword.submit', 'Send Reset Link')}
      </Button>

      {forgotPasswordMutation.isError && (
        <Text className="text-danger text-center mt-4">
          {t('forgotPassword.error.emailNotFound', 'No account found with this email')}
        </Text>
      )}
    </AuthScaffold>
  );
}
