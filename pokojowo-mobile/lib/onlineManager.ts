import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

/**
 * Teach React Query when the device is offline.
 *
 * Its default detection listens for the browser's online/offline events, which
 * do not exist here, so on React Native it assumes it is always online: queries
 * fire into a dead network and fail instead of pausing until there is a
 * connection to use. NetInfo is the substitute.
 *
 * Imported for its side effect from app/_layout.tsx, which is the earliest
 * point that runs on every launch.
 */
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    // isInternetReachable is null until the first probe finishes. Treating that
    // as offline would pause every query during startup, so only an explicit
    // false counts — that is the captive-portal case, connected to a network
    // that goes nowhere.
    setOnline(state.isConnected === true && state.isInternetReachable !== false);
  })
);
