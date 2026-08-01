import { Redirect, Slot } from 'expo-router';
import useAuthStore from '@/stores/authStore';

/**
 * Landlord-only section.
 *
 * The profile menu already hides these entries from tenants, but that is not a
 * guard: a deep link or a notification route reaches them directly. The API
 * enforces the real restriction; this stops a tenant seeing a landlord screen
 * render against their account.
 */
export default function LandlordLayout() {
  const { user } = useAuthStore();
  const roles = (user?.role ?? []).map((role) => role.toLowerCase());

  if (!roles.includes('landlord')) {
    return <Redirect href="/(app)/(home)" />;
  }

  return <Slot />;
}
