import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Fingerprint } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import {
  authenticateWithBiometrics,
  isBiometricAvailable,
  isBiometricLoginEnabled,
} from '@/lib/biometrics';
import useAuthStore from '@/stores/authStore';
import useTheme from '@/hooks/useTheme';

interface BiometricGateProps {
  children: React.ReactNode;
}

/**
 * Locks the authenticated app behind a biometric prompt when the user has opted
 * in (Settings → Security). Re-locks whenever the app returns from the
 * background so a device left unlocked doesn't leak the session.
 */
export default function BiometricGate({ children }: BiometricGateProps) {
  const { t } = useTranslation('auth');
  const { colors } = useTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [locked, setLocked] = useState(false);
  const appState = useRef(AppState.currentState);
  const authenticating = useRef(false);

  const tryUnlock = useCallback(async () => {
    if (authenticating.current) return;
    authenticating.current = true;
    try {
      const result = await authenticateWithBiometrics(t('locked.prompt', 'Unlock Pokojowo'));
      if (result.success) setLocked(false);
    } finally {
      authenticating.current = false;
    }
  }, [t]);

  const maybeLock = useCallback(async () => {
    try {
      const enabled = isAuthenticated && (await isBiometricLoginEnabled());
      // If enrollment is removed after opting in, fail open rather than
      // trapping the user behind an unlock prompt that can never succeed.
      if (!enabled || !(await isBiometricAvailable())) {
        setLocked(false);
        return;
      }
      setLocked(true);
      void tryUnlock();
    } catch {
      setLocked(false);
    }
  }, [isAuthenticated, tryUnlock]);

  useEffect(() => {
    maybeLock();
  }, [maybeLock]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appState.current;
      appState.current = next;
      if (prev.match(/inactive|background/) && next === 'active') {
        maybeLock();
      }
    });
    return () => sub.remove();
  }, [maybeLock]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {locked && (
        <View
          className="bg-bg items-center justify-center px-8"
          style={StyleSheet.absoluteFill}
        >
          <View className="w-24 h-24 rounded-full bg-brand/10 items-center justify-center mb-6">
            <Fingerprint size={48} color={colors.brand} />
          </View>
          <Text className="text-text text-xl font-bold">{t('locked.title', 'App locked')}</Text>
          <Text className="text-muted text-center mt-1 mb-8">
            {t('locked.subtitle', 'Unlock with biometrics to continue')}
          </Text>
          <TouchableOpacity
            onPress={tryUnlock}
            className="bg-brand px-8 py-3 rounded-xl"
            activeOpacity={0.8}
          >
            <Text className="text-brand-fg font-semibold">{t('locked.unlock', 'Unlock')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
