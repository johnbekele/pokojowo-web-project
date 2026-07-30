import { useState } from 'react';
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

const signupSchema = z
  .object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupScreen() {
  const { t } = useTranslation('auth');
  const { colors } = useTheme();
  const { register, isLoading, error } = useAuthStore();
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
    try {
      await register({ username: data.username, email: data.email, password: data.password });
      setSuccess(true);
    } catch {
      // handled by store
    }
  };

  if (success) {
    return (
      <AuthStatusView
        tone="success"
        title={t('signup.successTitle', 'Account Created!')}
        message={t('signup.successMessage', 'Please check your email to verify your account.')}
        primaryAction={{
          label: t('signup.goToLogin', 'Go to Login'),
          onPress: () => router.replace('/(auth)/login'),
        }}
      />
    );
  }

  return (
    <AuthScaffold
      showBrand={false}
      title={t('signup.title', 'Create Account')}
      subtitle={t('signup.subtitle', 'Join Pokojowo to find your perfect flatmate')}
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
            label={t('signup.username', 'Username')}
            placeholder={t('signup.usernamePlaceholder', 'Choose a username')}
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
            label={t('signup.email', 'Email')}
            placeholder={t('signup.emailPlaceholder', 'Enter your email')}
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
            label={t('signup.password', 'Password')}
            placeholder={t('signup.passwordPlaceholder', 'Create a password')}
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
            label={t('signup.confirmPassword', 'Confirm Password')}
            placeholder={t('signup.confirmPasswordPlaceholder', 'Confirm your password')}
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
        {t('signup.submit', 'Create Account')}
      </Button>

      <View className="flex-row items-center my-6">
        <View className="flex-1 h-px bg-border" />
        <Text className="mx-4 text-muted">{t('login.or', 'or')}</Text>
        <View className="flex-1 h-px bg-border" />
      </View>

      <SocialAuthButtons />

      <View className="flex-row justify-center mt-6">
        <Text className="text-muted">{t('signup.hasAccount', 'Already have an account? ')}</Text>
        <Link href="/(auth)/login" asChild>
          <Text className="text-brand font-semibold">{t('signup.signIn', 'Sign in')}</Text>
        </Link>
      </View>
    </AuthScaffold>
  );
}
