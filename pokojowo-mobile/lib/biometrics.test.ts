jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
  authenticateAsync: jest.fn(),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}));

jest.mock('./storage', () => ({
  storage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
  STORAGE_KEYS: { BIOMETRICS_ENABLED: 'biometricsEnabled' },
}));

import * as LocalAuthentication from 'expo-local-authentication';
import {
  authenticateWithBiometrics,
  getSupportedBiometricTypes,
  isBiometricAvailable,
} from './biometrics';

const auth = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>;

describe('biometric helpers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fails open when native availability checks throw', async () => {
    auth.hasHardwareAsync.mockRejectedValueOnce(new Error('native API unavailable'));

    await expect(isBiometricAvailable()).resolves.toBe(false);
    await expect(getSupportedBiometricTypes()).resolves.toEqual([]);
  });

  it('does not invoke the prompt when no enrolled biometric exists', async () => {
    auth.hasHardwareAsync.mockResolvedValueOnce(false);
    auth.isEnrolledAsync.mockResolvedValueOnce(false);

    await expect(authenticateWithBiometrics('Unlock Pokojowo')).resolves.toEqual({
      success: false,
      error: 'Biometric authentication is not available',
    });
    expect(auth.authenticateAsync).not.toHaveBeenCalled();
  });

  it('lets the operating system localize passcode fallback controls', async () => {
    auth.hasHardwareAsync.mockResolvedValueOnce(true);
    auth.isEnrolledAsync.mockResolvedValueOnce(true);
    auth.authenticateAsync.mockResolvedValueOnce({ success: true });

    await expect(authenticateWithBiometrics('Odblokuj Pokojowo')).resolves.toEqual({ success: true });
    expect(auth.authenticateAsync).toHaveBeenCalledWith({
      promptMessage: 'Odblokuj Pokojowo',
      disableDeviceFallback: false,
    });
  });
});
