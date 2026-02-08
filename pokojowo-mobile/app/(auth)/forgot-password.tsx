import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react-native';

import { Button, Input } from '@/components/ui';
import { useForgotPassword } from '@/hooks/auth/useAuth';
import { COLORS } from '@/lib/constants';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const { t } = useTranslation('auth');
  const [isSuccess, setIsSuccess] = useState(false);
  const forgotPasswordMutation = useForgotPassword();

  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await forgotPasswordMutation.mutateAsync(data.email);
      setIsSuccess(true);
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isSuccess) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-6">
            <CheckCircle size={48} color={COLORS.success} />
          </View>
          <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
            {t('forgotPassword.success.title', 'Check Your Email')}
          </Text>
          <Text className="text-gray-500 text-center mb-8">
            {t(
              'forgotPassword.success.message',
              "We've sent password reset instructions to your email."
            )}
          </Text>
          <Text className="text-gray-400 text-center mb-8">
            {getValues('email')}
          </Text>
          <Button
            variant="primary"
            onPress={() => router.replace('/(auth)/login')}
            fullWidth
          >
            {t('forgotPassword.backToLogin', 'Back to Sign In')}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          <View className="px-4 py-2">
            <Link href="/(auth)/login" asChild>
              <Button variant="ghost" icon={<ArrowLeft size={20} color={COLORS.gray[600]} />}>
                {t('forgotPassword.backToLogin', 'Back to Sign In')}
              </Button>
            </Link>
          </View>

          <View className="flex-1 px-6 pt-8">
            {/* Header */}
            <View className="mb-8">
              <Text className="text-3xl font-bold text-gray-900 mb-2">
                {t('forgotPassword.title', 'Forgot Password?')}
              </Text>
              <Text className="text-gray-500">
                {t(
                  'forgotPassword.subtitle',
                  "No worries, we'll send you reset instructions"
                )}
              </Text>
            </View>

            {/* Form */}
            <View className="gap-4">
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
                    leftIcon={<Mail size={20} color={COLORS.gray[400]} />}
                  />
                )}
              />

              <Button
                onPress={handleSubmit(onSubmit)}
                loading={forgotPasswordMutation.isPending}
                fullWidth
              >
                {forgotPasswordMutation.isPending
                  ? t('forgotPassword.submitting', 'Sending...')
                  : t('forgotPassword.submit', 'Send Reset Link')}
              </Button>

              {forgotPasswordMutation.isError && (
                <Text className="text-red-500 text-center">
                  {t('forgotPassword.error.emailNotFound', 'No account found with this email')}
                </Text>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
