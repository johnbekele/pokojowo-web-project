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
  const { register, isLoading, error } = useAuthStore();
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: SignupForm) => {
    try {
      await register({
        username: data.username,
        email: data.email,
        password: data.password,
      });
      setSuccess(true);
    } catch {
      // Error is handled by the store
    }
  };

  if (success) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center px-6">
        <View className="items-center">
          <View className="bg-primary-100 rounded-full p-6 mb-6">
            <Text className="text-4xl">✓</Text>
          </View>
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            {t('signup.successTitle', 'Account Created!')}
          </Text>
          <Text className="text-gray-500 text-center mb-8">
            {t('signup.successMessage', 'Please check your email to verify your account.')}
          </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity className="bg-primary-600 rounded-lg py-4 px-8">
              <Text className="text-white font-semibold">
                {t('signup.goToLogin', 'Go to Login')}
              </Text>
            </TouchableOpacity>
          </Link>
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
          <View className="flex-1 justify-center px-6 py-12">
            {/* Header */}
            <View className="mb-8">
              <Text className="text-3xl font-bold text-gray-900">
                {t('signup.title', 'Create Account')}
              </Text>
              <Text className="text-gray-500 mt-2">
                {t('signup.subtitle', 'Join Pokojowo to find your perfect flatmate')}
              </Text>
            </View>

            {/* Error message */}
            {error && (
              <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <Text className="text-red-600 text-center">{error}</Text>
              </View>
            )}

            {/* Username input */}
            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">
                {t('signup.username', 'Username')}
              </Text>
              <Controller
                control={control}
                name="username"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className={`border rounded-lg px-4 py-3 text-base ${
                      errors.username ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={t('signup.usernamePlaceholder', 'Choose a username')}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.username && (
                <Text className="text-red-500 text-sm mt-1">
                  {errors.username.message}
                </Text>
              )}
            </View>

            {/* Email input */}
            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">
                {t('signup.email', 'Email')}
              </Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className={`border rounded-lg px-4 py-3 text-base ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={t('signup.emailPlaceholder', 'Enter your email')}
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
            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">
                {t('signup.password', 'Password')}
              </Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className={`border rounded-lg px-4 py-3 text-base ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={t('signup.passwordPlaceholder', 'Create a password')}
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

            {/* Confirm password input */}
            <View className="mb-6">
              <Text className="text-gray-700 mb-2 font-medium">
                {t('signup.confirmPassword', 'Confirm Password')}
              </Text>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className={`border rounded-lg px-4 py-3 text-base ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={t('signup.confirmPasswordPlaceholder', 'Confirm your password')}
                    secureTextEntry
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.confirmPassword && (
                <Text className="text-red-500 text-sm mt-1">
                  {errors.confirmPassword.message}
                </Text>
              )}
            </View>

            {/* Signup button */}
            <TouchableOpacity
              className={`bg-primary-600 rounded-lg py-4 mb-6 ${
                isLoading ? 'opacity-70' : ''
              }`}
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-semibold text-lg">
                  {t('signup.submit', 'Create Account')}
                </Text>
              )}
            </TouchableOpacity>

            {/* Login link */}
            <View className="flex-row justify-center">
              <Text className="text-gray-500">
                {t('signup.hasAccount', 'Already have an account? ')}
              </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text className="text-primary-600 font-semibold">
                    {t('signup.signIn', 'Sign in')}
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
