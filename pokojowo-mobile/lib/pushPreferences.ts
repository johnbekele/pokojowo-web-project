import type { NotificationPreferences } from '@/types/user.types';

/**
 * Support both the current nested API shape and the legacy flat mobile shape
 * while clients migrate. Push remains enabled when no preference was saved.
 */
export function pushNotificationsEnabled(preferences?: NotificationPreferences | null): boolean {
  if (!preferences) return true;

  const nested = preferences.push;
  if (nested) {
    const values = Object.values(nested);
    return values.length === 0 || values.some((value) => value !== false);
  }

  const legacy = [
    preferences.push_new_message,
    preferences.push_new_match,
    preferences.push_listing_interest,
  ].filter((value): value is boolean => typeof value === 'boolean');
  return legacy.length === 0 || legacy.some((value) => value !== false);
}
