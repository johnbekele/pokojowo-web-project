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
  toggle: (next: boolean) => Promise<boolean>;
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
      const [avail, supported, on] = await Promise.all([
        isBiometricAvailable(),
        getSupportedBiometricTypes(),
        isBiometricLoginEnabled(),
      ]);
      if (!mounted) return;
      setAvailable(avail);
      setTypes(supported);
      setEnabled(on && avail);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const toggle = useCallback(async (next: boolean) => {
    if (next) {
      const result = await authenticateWithBiometrics('Confirm to enable biometric unlock');
      if (!result.success) return false;
    }
    await setBiometricLoginEnabled(next);
    setEnabled(next);
    return true;
  }, []);

  return { available, enabled, types, toggle };
}

export default useBiometricSetting;
