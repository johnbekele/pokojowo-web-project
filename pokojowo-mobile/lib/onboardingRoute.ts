import type { Href } from 'expo-router';
import type { User } from '@/types/user.types';

/**
 * Computes where an authenticated user should land based on onboarding state:
 * 1. No tenant/landlord role selected -> role picker. The API includes the
 *    default `User` role before onboarding, so checking `roles.length` is not
 *    sufficient here.
 * 2. Role selected but profile explicitly incomplete -> profile completion
 * 3. Otherwise -> home
 *
 * Legacy users without a `profile_completion` object are treated as complete so
 * they aren't forced back through onboarding.
 */
export function getPostAuthRoute(user: User | null): Href {
  if (!user) return '/(auth)/login';

  const roles = user.role ?? [];
  const hasTenantRole = roles.includes('Tenant') || roles.includes('tenant');
  const hasLandlordRole = roles.includes('Landlord') || roles.includes('landlord');
  if (!hasTenantRole && !hasLandlordRole) return '/onboarding/role';

  const needsProfile =
    user.isProfileComplete === false ||
    user.is_profile_complete === false ||
    user.profile_completion?.completed === false;
  if (needsProfile) {
    const landlordOnly = hasLandlordRole && !hasTenantRole;
    return landlordOnly
      ? '/onboarding/profile-completion/landlord'
      : '/onboarding/profile-completion/tenant';
  }

  return '/(app)/(home)';
}
