import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Slot } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { queryClient } from '@/lib/queryClient';
import i18n from '@/lib/i18n';
import useAuthStore from '@/stores/authStore';

import '../global.css';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const { initialize } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      try {
        await initialize();
      } catch (e) {
        console.log('Auth init error:', e);
      } finally {
        // Always mark as ready after initialization attempt
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    };

    // Add a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      setIsReady(true);
      SplashScreen.hideAsync();
    }, 3000);

    init().then(() => clearTimeout(timeout));

    return () => clearTimeout(timeout);
  }, [initialize]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#0d9488" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <StatusBar style="auto" />
            <Slot />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </I18nextProvider>
    </QueryClientProvider>
  );
}
