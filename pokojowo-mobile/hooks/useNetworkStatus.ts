import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Whether the device currently has a usable connection.
 *
 * Starts optimistic: NetInfo reports reachability asynchronously, and flashing
 * an offline banner for a moment on every launch is worse than being a beat
 * late to show it.
 */
export default function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected === true && state.isInternetReachable !== false);
    });
  }, []);

  return { isOnline, isOffline: !isOnline };
}
