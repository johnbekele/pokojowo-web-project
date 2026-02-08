// Storage
export { storage, STORAGE_KEYS } from './storage';

// API
export { default as api, normalizeError } from './api';
export type { NormalizedError } from './api';

// Socket
export {
  connectSocket,
  initSocket,
  getSocket,
  disconnectSocket,
  joinRoom,
  leaveRoom,
  trackRoom,
  untrackRoom,
  sendMessage,
  sendTyping,
} from './socket';

// Query Client
export { queryClient } from './queryClient';

// Utils
export {
  cn,
  formatDate,
  formatRelativeTime,
  capitalize,
  truncate,
  getInitials,
  formatCurrency,
  debounce,
  sleep,
  isEmpty,
  generateId,
} from './utils';

// i18n
export { default as i18n, changeLanguage } from './i18n';

// Notifications
export {
  registerForPushNotifications,
  handleNotificationResponse,
  scheduleLocalNotification,
  cancelNotification,
  cancelAllNotifications,
  getBadgeCount,
  setBadgeCount,
} from './notifications';

// Biometrics
export {
  isBiometricAvailable,
  getSupportedBiometricTypes,
  authenticateWithBiometrics,
  isBiometricLoginEnabled,
  setBiometricLoginEnabled,
} from './biometrics';
export type { BiometricType } from './biometrics';

// Constants
export * from './constants';
