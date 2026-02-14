import { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react-native';

import { Button, Input } from '@/components/ui';
import { useResetPassword } from '@/hooks/auth/useAuth';
import { COLORS } from '@/lib/constants';

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
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const resetPasswordMutation = useResetPassword();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return;

    try {
      await resetPasswordMutation.mutateAsync({
        token,
        password: data.password,
      });
      setIsSuccess(true);
      // Auto redirect after 2 seconds
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 2000);
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Invalid or missing token
  if (!token) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 rounded-full bg-red-100 items-center justify-center mb-6">
            <AlertCircle size={48} color={COLORS.error} />
          </View>
          <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
            {t('resetPassword.invalid.title', 'Invalid Link')}
          </Text>
          <Text className="text-gray-500 text-center mb-8">
            {t(
              'resetPassword.invalid.message',
              'This password reset link is invalid or has expired.'
            )}
          </Text>
          <Button
            variant="primary"
            onPress={() => router.replace('/(auth)/forgot-password')}
            fullWidth
          >
            {t('resetPassword.invalid.requestNew', 'Request New Link')}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-6">
            <CheckCircle size={48} color={COLORS.success} />
          </View>
          <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
            {t('resetPassword.success.title', 'Password Reset!')}
          </Text>
          <Text className="text-gray-500 text-center mb-4">
            {t(
              'resetPassword.success.message',
              'Your password has been reset successfully.'
            )}
          </Text>
          <Text className="text-gray-400 text-center">
            {t('resetPassword.success.redirecting', 'Redirecting to login...')}
          </Text>
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
          <View className="flex-1 px-6 pt-12">
            {/* Header */}
            <View className="mb-8">
              <Text className="text-3xl font-bold text-primary-600 text-center mb-4">
                Pokojowo
              </Text>
              <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
                {t('resetPassword.title', 'Reset Your Password')}
              </Text>
              <Text className="text-gray-500 text-center">
                {t('resetPassword.subtitle', 'Enter your new password below')}
              </Text>
            </View>

            {/* Form */}
            <View className="gap-4">
              {/* Password field */}
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View>
                    <Text className="text-gray-700 font-medium mb-2">
                      {t('resetPassword.password', 'New Password')}
                    </Text>
                    <View className="relative">
                      <Input
                        placeholder={t('resetPassword.passwordPlaceholder', 'Enter new password')}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        error={errors.password?.message}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        leftIcon={<Lock size={20} color={COLORS.gray[400]} />}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3.5"
                      >
                        {showPassword ? (
                          <EyeOff size={20} color={COLORS.gray[500]} />
                        ) : (
                          <Eye size={20} color={COLORS.gray[500]} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />

              {/* Confirm password field */}
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
                    secureTextEntry={true}
                    autoCapitalize="none"
                    leftIcon={<Lock size={20} color={COLORS.gray[400]} />}
                  />
                )}
              />

              {/* Error message */}
              {resetPasswordMutation.isError && (
                <View className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <Text className="text-red-600 text-center">
                    {t(
                      'resetPassword.error.failed',
                      'Failed to reset password. The link may have expired.'
                    )}
                  </Text>
                </View>
              )}

              {/* Submit button */}
              <Button
                onPress={handleSubmit(onSubmit)}
                loading={resetPasswordMutation.isPending}
                fullWidth
                className="mt-2"
              >
                {resetPasswordMutation.isPending
                  ? t('resetPassword.submitting', 'Resetting...')
                  : t('resetPassword.submit', 'Reset Password')}
              </Button>

              {/* Back to login */}
              <Button
                variant="ghost"
                onPress={() => router.replace('/(auth)/login')}
                fullWidth
              >
                {t('resetPassword.backToLogin', 'Back to Sign In')}
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
