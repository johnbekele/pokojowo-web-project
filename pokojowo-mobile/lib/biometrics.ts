import * as LocalAuthentication from 'expo-local-authentication';
import { storage, STORAGE_KEYS } from './storage';

export type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'none';

/**
 * Check if biometric authentication is available
 */
export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return compatible && enrolled;
}

/**
 * Get supported biometric types
 */
export async function getSupportedBiometricTypes(): Promise<BiometricType[]> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  return types.map((type) => {
    switch (type) {
      case LocalAuthentication.AuthenticationType.FINGERPRINT:
        return 'fingerprint';
      case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
        return 'facial';
      case LocalAuthentication.AuthenticationType.IRIS:
        return 'iris';
      default:
        return 'none';
    }
  });
}

/**
 * Authenticate with biometrics
 */
export async function authenticateWithBiometrics(
  promptMessage = 'Authenticate to continue'
): Promise<{ success: boolean; error?: string }> {
  try {
    const isAvailable = await isBiometricAvailable();
    if (!isAvailable) {
      return {
        success: false,
        error: 'Biometric authentication is not available',
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
      fallbackLabel: 'Use passcode',
    });

    if (result.success) {
      return { success: true };
    }

    return {
      success: false,
      error: result.error || 'Authentication failed',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication error',
    };
  }
}

/**
 * Check if biometric login is enabled by user
 */
export async function isBiometricLoginEnabled(): Promise<boolean> {
  const enabled = await storage.getItem(STORAGE_KEYS.BIOMETRICS_ENABLED);
  return enabled === 'true';
}

/**
 * Enable or disable biometric login
 */
export async function setBiometricLoginEnabled(enabled: boolean): Promise<void> {
  await storage.setItem(STORAGE_KEYS.BIOMETRICS_ENABLED, enabled ? 'true' : 'false');
}

export default {
  isBiometricAvailable,
  getSupportedBiometricTypes,
  authenticateWithBiometrics,
  isBiometricLoginEnabled,
  setBiometricLoginEnabled,
};
