import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import useAuthStore from '@/stores/authStore';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { t } = useTranslation('auth');
  const { login, setUser, isLoading, error } = useAuthStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password);
      router.replace('/(app)/(home)');
    } catch {
      // Error is handled by the store
    }
  };

  // Test user login bypass
  const handleTestLogin = () => {
    // Set a mock test user
    useAuthStore.setState({
      user: {
        id: 'test-user-123',
        username: 'testuser',
        email: 'test@pokojowo.com',
        firstname: 'Test',
        lastname: 'User',
        role: ['Tenant'],
        photo: undefined,
      },
      token: 'test-token-123',
      refreshToken: 'test-refresh-123',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
    router.replace('/(app)/(home)');
  };

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
          <View className="flex-1 justify-center px-6 py-12">
            {/* Logo/Header */}
            <View className="mb-10">
              <Text className="text-4xl font-bold text-teal-600 text-center">
                Pokojowo
              </Text>
              <Text className="text-gray-500 text-center mt-2">
                {t('login.subtitle', 'Find your perfect flatmate')}
              </Text>
            </View>

            {/* Error message */}
            {error && (
              <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <Text className="text-red-600 text-center">{error}</Text>
              </View>
            )}

            {/* Email input */}
            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">
                {t('login.email', 'Email')}
              </Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className={`border rounded-lg px-4 py-3 text-base ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={t('login.emailPlaceholder', 'Enter your email')}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.email && (
                <Text className="text-red-500 text-sm mt-1">
                  {errors.email.message}
                </Text>
              )}
            </View>

            {/* Password input */}
            <View className="mb-6">
              <Text className="text-gray-700 mb-2 font-medium">
                {t('login.password', 'Password')}
              </Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className={`border rounded-lg px-4 py-3 text-base ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={t('login.passwordPlaceholder', 'Enter your password')}
                    secureTextEntry
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.password && (
                <Text className="text-red-500 text-sm mt-1">
                  {errors.password.message}
                </Text>
              )}
            </View>

            {/* Login button */}
            <TouchableOpacity
              className={`bg-teal-600 rounded-lg py-4 mb-4 ${
                isLoading ? 'opacity-70' : ''
              }`}
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-semibold text-lg">
                  {t('login.submit', 'Sign In')}
                </Text>
              )}
            </TouchableOpacity>

            {/* TEST USER BUTTON - For Development */}
            <TouchableOpacity
              className="bg-orange-500 rounded-lg py-4 mb-4"
              onPress={handleTestLogin}
            >
              <Text className="text-white text-center font-semibold text-lg">
                Login as Test User (Dev)
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View className="flex-row items-center my-6">
              <View className="flex-1 h-px bg-gray-300" />
              <Text className="mx-4 text-gray-500">{t('login.or', 'or')}</Text>
              <View className="flex-1 h-px bg-gray-300" />
            </View>

            {/* Google login */}
            <TouchableOpacity className="border border-gray-300 rounded-lg py-4 mb-6">
              <Text className="text-gray-700 text-center font-semibold">
                {t('login.google', 'Continue with Google')}
              </Text>
            </TouchableOpacity>

            {/* Sign up link */}
            <View className="flex-row justify-center">
              <Text className="text-gray-500">
                {t('login.noAccount', "Don't have an account? ")}
              </Text>
              <Link href="/(auth)/signup" asChild>
                <TouchableOpacity>
                  <Text className="text-teal-600 font-semibold">
                    {t('login.signUp', 'Sign up')}
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
