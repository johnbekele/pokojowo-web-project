import { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { Link, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Lock } from 'lucide-react-native';

import { Button, Input } from '@/components/ui';
import AuthScaffold from '@/components/feature/auth/AuthScaffold';
import AuthStatusView from '@/components/feature/auth/AuthStatusView';
import SocialAuthButtons from '@/components/feature/auth/SocialAuthButtons';
import useAuthStore from '@/stores/authStore';
import useTheme from '@/hooks/useTheme';
import useUIStore from '@/stores/uiStore';

type SignupForm = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export default function SignupScreen() {
  const { t } = useTranslation('auth');
  const { colors } = useTheme();
  const showToast = useUIStore((s) => s.showToast);
  const { register, isLoading, error } = useAuthStore();
  const signupSchema = useMemo(
    () =>
      z
        .object({
          username: z.string().min(3, t('validation.username')),
          email: z.string().email(t('validation.email')),
          password: z.string().min(10, t('validation.passwordLength')),
          confirmPassword: z.string(),
        })
        .superRefine((data, ctx) => {
          const normalized = data.password.toLowerCase();
          const emailLocalPart = data.email.split('@')[0];
          if ([data.username, emailLocalPart].some((value) => value && normalized.includes(value.toLowerCase()))) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('validation.passwordPersonalInfo'),
              path: ['password'],
            });
          }
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: t('validation.passwordMatch'),
          path: ['confirmPassword'],
        }),
    [t]
  );
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: SignupForm) => {
    const result = await register({ username: data.username, email: data.email, password: data.password });
    if (result.success) {
      setSuccess(true);
    } else {
      showToast({
        type: 'error',
        message: result.error || error || t('signup.error.generic'),
      });
    }
  };

  if (success) {
    return (
      <AuthStatusView
        tone="success"
        title={t('signup.success.title')}
        message={t('signup.success.message')}
        primaryAction={{
          label: t('signup.goToLogin'),
          onPress: () => router.replace('/(auth)/login'),
        }}
      />
    );
  }

  return (
    <AuthScaffold
      showBrand={false}
      title={t('signup.title')}
      subtitle={t('signup.subtitle')}
      onBack={() => router.replace('/(auth)/login')}
    >
      {error && (
        <View className="bg-danger/10 border border-danger/30 rounded-lg p-3 mb-4">
          <Text className="text-danger text-center">{error}</Text>
        </View>
      )}

      <Controller
        control={control}
        name="username"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label={t('signup.username')}
            placeholder={t('signup.usernamePlaceholder')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.username?.message}
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon={<User size={20} color={colors.muted} />}
          />
        )}
      />

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label={t('signup.email')}
            placeholder={t('signup.emailPlaceholder')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.email?.message}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            leftIcon={<Mail size={20} color={colors.muted} />}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label={t('signup.password')}
            placeholder={t('signup.passwordPlaceholder')}
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
        {t('signup.passwordRequirements')}
      </Text>

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label={t('signup.confirmPassword')}
            placeholder={t('signup.confirmPasswordPlaceholder')}
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

      <Button onPress={handleSubmit(onSubmit)} loading={isLoading} fullWidth className="mt-2">
        {t('signup.submit')}
      </Button>

      <View className="flex-row items-center my-6">
        <View className="flex-1 h-px bg-border" />
        <Text className="mx-4 text-muted">{t('login.or')}</Text>
        <View className="flex-1 h-px bg-border" />
      </View>

      <SocialAuthButtons />

      <View className="flex-row justify-center mt-6">
        <Text className="text-muted">{t('signup.hasAccount')}</Text>
        <Link href="/(auth)/login" asChild>
          <Text className="text-brand font-semibold">{t('signup.signIn')}</Text>
        </Link>
      </View>
    </AuthScaffold>
  );
}
