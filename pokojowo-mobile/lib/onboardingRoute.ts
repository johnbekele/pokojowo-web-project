import type { Href } from 'expo-router';
import type { User } from '@/types/user.types';

/**
 * Computes where an authenticated user should land based on onboarding state:
 * 1. No role selected -> role picker
 * 2. Role selected but profile explicitly incomplete -> profile completion
 * 3. Otherwise -> home
 *
 * Legacy users without a `profile_completion` object are treated as complete so
 * they aren't forced back through onboarding.
 */
export function getPostAuthRoute(user: User | null): Href {
  if (!user) return '/(auth)/login';

  const roles = user.role ?? [];
  if (roles.length === 0) return '/onboarding/role';

  const needsProfile = user.profile_completion?.completed === false;
  if (needsProfile) {
    const landlordOnly = roles.includes('Landlord') && !roles.includes('Tenant');
    return landlordOnly
      ? '/onboarding/profile-completion/landlord'
      : '/onboarding/profile-completion/tenant';
  }

  return '/(app)/(home)';
}
