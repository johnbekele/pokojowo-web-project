import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import useAuthStore from '@/stores/authStore';
import { getPostAuthRoute } from '@/lib/onboardingRoute';
import { GoogleLogo, AppleLogo } from '@/components/shared/brand';

type Provider = 'google' | 'apple';

/**
 * Brand-compliant Google + Apple sign-in buttons. Google uses the white/bordered
 * treatment; Apple uses the black button (iOS only, shown when Sign in with
 * Apple is available). Both route to the correct post-auth screen on success.
 */
export default function SocialAuthButtons() {
  const { t } = useTranslation('auth');
  const { loginWithGoogle, loginWithApple } = useAuthStore();

  const [pending, setPending] = useState<Provider | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (Platform.OS !== 'ios') return;
    (async () => {
      try {
        const AppleAuthentication = await import('expo-apple-authentication');
        const available = await AppleAuthentication.isAvailableAsync();
        if (mounted) setAppleAvailable(available);
      } catch {
        if (mounted) setAppleAvailable(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const run = async (provider: Provider) => {
    setPending(provider);
    const result = provider === 'google' ? await loginWithGoogle() : await loginWithApple();
    setPending(null);
    if (result.success) {
      router.replace(getPostAuthRoute(result.user ?? null));
    }
  };

  return (
    <View className="gap-3">
      <TouchableOpacity
        onPress={() => run('google')}
        disabled={pending !== null}
        activeOpacity={0.8}
        className="flex-row items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg min-h-[52px] px-4"
        style={{ opacity: pending && pending !== 'google' ? 0.5 : 1 }}
      >
        {pending === 'google' ? (
          <ActivityIndicator size="small" color="#111827" />
        ) : (
          <>
            <GoogleLogo size={20} />
            <Text className="text-base font-semibold text-gray-900">
              {t('login.google', 'Continue with Google')}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {appleAvailable && (
        <TouchableOpacity
          onPress={() => run('apple')}
          disabled={pending !== null}
          activeOpacity={0.8}
          className="flex-row items-center justify-center gap-3 bg-black rounded-lg min-h-[52px] px-4"
          style={{ opacity: pending && pending !== 'apple' ? 0.5 : 1 }}
        >
          {pending === 'apple' ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <AppleLogo size={20} color="#ffffff" />
              <Text className="text-base font-semibold text-white">
                {t('login.apple', 'Continue with Apple')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
