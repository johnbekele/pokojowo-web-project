import { useCallback, useEffect, useState } from 'react';

import {
  authenticateWithBiometrics,
  getSupportedBiometricTypes,
  isBiometricAvailable,
  isBiometricLoginEnabled,
  setBiometricLoginEnabled,
  type BiometricType,
} from '@/lib/biometrics';

interface BiometricSetting {
  available: boolean;
  enabled: boolean;
  types: BiometricType[];
  /** Toggle biometric login; requires a successful auth before enabling. */
  toggle: (next: boolean, promptMessage?: string) => Promise<boolean>;
}

/**
 * Reads and mutates the biometric-login preference, gating the enable action
 * behind a live biometric check so we never persist an unusable setting.
 */
export function useBiometricSetting(): BiometricSetting {
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [types, setTypes] = useState<BiometricType[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      let avail = false;
      let supported: BiometricType[] = [];
      let on = false;
      try {
        [avail, supported, on] = await Promise.all([
          isBiometricAvailable(),
          getSupportedBiometricTypes(),
          isBiometricLoginEnabled(),
        ]);
      } catch {
        // Native biometric APIs can be unavailable on simulators/web builds.
      }
      if (!mounted) return;
      setAvailable(avail);
      setTypes(supported);
      setEnabled(on && avail);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const toggle = useCallback(async (next: boolean, promptMessage = 'Confirm to enable biometric unlock') => {
    try {
      if (next) {
        const result = await authenticateWithBiometrics(promptMessage);
        if (!result.success) return false;
      }
      await setBiometricLoginEnabled(next);
      setEnabled(next);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { available, enabled, types, toggle };
}

export default useBiometricSetting;
