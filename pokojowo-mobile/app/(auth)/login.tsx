import { View, Text, TouchableOpacity } from 'react-native';
import { Link, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock } from 'lucide-react-native';

import { Button, Input } from '@/components/ui';
import AuthScaffold from '@/components/feature/auth/AuthScaffold';
import useAuthStore from '@/stores/authStore';
import useTheme from '@/hooks/useTheme';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { t } = useTranslation('auth');
  const { colors } = useTheme();
  const { login, isLoading, error } = useAuthStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password);
      router.replace('/(app)/(home)');
    } catch {
      // handled by store (error state)
    }
  };

  return (
    <AuthScaffold subtitle={t('login.subtitle', 'Find your perfect flatmate')}>
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
            label={t('login.email', 'Email')}
            placeholder={t('login.emailPlaceholder', 'Enter your email')}
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
            label={t('login.password', 'Password')}
            placeholder={t('login.passwordPlaceholder', 'Enter your password')}
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
              {t('login.forgotPassword', 'Forgot password?')}
            </Text>
          </TouchableOpacity>
        </Link>
      </View>

      <Button onPress={handleSubmit(onSubmit)} loading={isLoading} fullWidth>
        {t('login.submit', 'Sign In')}
      </Button>

      <View className="flex-row items-center my-6">
        <View className="flex-1 h-px bg-border" />
        <Text className="mx-4 text-muted">{t('login.or', 'or')}</Text>
        <View className="flex-1 h-px bg-border" />
      </View>

      <Button variant="outline" fullWidth onPress={() => { /* wired in #93 */ }}>
        {t('login.google', 'Continue with Google')}
      </Button>

      <View className="flex-row justify-center mt-6">
        <Text className="text-muted">{t('login.noAccount', "Don't have an account? ")}</Text>
        <Link href="/(auth)/signup" asChild>
          <TouchableOpacity>
            <Text className="text-brand font-semibold">{t('login.signUp', 'Sign up')}</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </AuthScaffold>
  );
}
