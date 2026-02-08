import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const isSecureStoreAvailable = Platform.OS !== 'web';

/**
 * Storage wrapper that uses SecureStore on native and AsyncStorage on web
 * SecureStore is used for sensitive data like tokens
 */
export const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (isSecureStoreAvailable) {
        return await SecureStore.getItemAsync(key);
      }
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`Error getting item ${key}:`, error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (isSecureStoreAvailable) {
        await SecureStore.setItemAsync(key, value);
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error(`Error setting item ${key}:`, error);
      throw error;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (isSecureStoreAvailable) {
        await SecureStore.deleteItemAsync(key);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing item ${key}:`, error);
      throw error;
    }
  },

  async clear(): Promise<void> {
    try {
      if (!isSecureStoreAvailable) {
        await AsyncStorage.clear();
      }
      // SecureStore doesn't have a clear method, would need to track keys
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  },
};

// Storage keys constants
export const STORAGE_KEYS = {
  TOKEN: 'token',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  LANGUAGE: 'language',
  THEME: 'theme',
  PUSH_TOKEN: 'pushToken',
  BIOMETRICS_ENABLED: 'biometricsEnabled',
} as const;

export default storage;
