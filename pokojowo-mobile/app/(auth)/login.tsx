import { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Link, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock } from 'lucide-react-native';

import { Button, Input } from '@/components/ui';
import AuthScaffold from '@/components/feature/auth/AuthScaffold';
import SocialAuthButtons from '@/components/feature/auth/SocialAuthButtons';
import useAuthStore from '@/stores/authStore';
import useTheme from '@/hooks/useTheme';
import useUIStore from '@/stores/uiStore';
import { getPostAuthRoute } from '@/lib/onboardingRoute';

type LoginForm = { email: string; password: string };

export default function LoginScreen() {
  const { t } = useTranslation('auth');
  const { colors } = useTheme();
  const showToast = useUIStore((s) => s.showToast);
  const { login, isLoading, error } = useAuthStore();
  const loginSchema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('validation.email')),
        password: z.string().min(1, t('validation.passwordRequired')),
      }),
    [t]
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    const result = await login(data.email, data.password);
    if (result.success) {
      router.replace(getPostAuthRoute(result.user ?? null));
    } else {
      showToast({
        type: 'error',
        message: result.error || error || t('login.error.generic'),
      });
    }
  };

  return (
    <AuthScaffold subtitle={t('login.subtitle')}>
      {error && (
        <View className="bg-danger/10 border border-danger/30 rounded-lg p-3 mb-4">
          <Text className="text-danger text-center">{error}</Text>
        </View>
      )}

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label={t('login.email')}
            placeholder={t('login.emailPlaceholder')}
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
            label={t('login.password')}
            placeholder={t('login.passwordPlaceholder')}
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

      <View className="flex-row justify-end mb-4">
        <Link href="/(auth)/forgot-password" asChild>
          <TouchableOpacity>
            <Text className="text-brand font-medium">
              {t('login.forgotPassword')}
            </Text>
          </TouchableOpacity>
        </Link>
      </View>

      <Button onPress={handleSubmit(onSubmit)} loading={isLoading} fullWidth>
        {t('login.submit')}
      </Button>

      <View className="flex-row items-center my-6">
        <View className="flex-1 h-px bg-border" />
        <Text className="mx-4 text-muted">{t('login.or')}</Text>
        <View className="flex-1 h-px bg-border" />
      </View>

      <SocialAuthButtons />

      <View className="flex-row justify-center mt-6">
        <Text className="text-muted">{t('login.noAccount')}</Text>
        <Link href="/(auth)/signup" asChild>
          <TouchableOpacity>
            <Text className="text-brand font-semibold">{t('login.signUp')}</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </AuthScaffold>
  );
}
