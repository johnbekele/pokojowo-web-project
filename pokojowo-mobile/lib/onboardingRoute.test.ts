import { getPostAuthRoute } from './onboardingRoute';

describe('post-auth onboarding route', () => {
  it('returns the login route when no user is available', () => {
    expect(getPostAuthRoute(null)).toBe('/(auth)/login');
  });

  it('sends the backend default User role to role selection', () => {
    expect(getPostAuthRoute({ role: ['User'] } as never)).toBe('/onboarding/role');
  });

  it('also handles an empty role list', () => {
    expect(getPostAuthRoute({ role: [] } as never)).toBe('/onboarding/role');
  });

  it('sends incomplete landlords to landlord profile completion', () => {
    expect(getPostAuthRoute({
      role: ['Landlord'],
      isProfileComplete: false,
    } as never)).toBe('/onboarding/profile-completion/landlord');
  });

  it('sends incomplete tenants to tenant profile completion', () => {
    expect(getPostAuthRoute({
      role: ['User', 'Tenant'],
      isProfileComplete: false,
    } as never)).toBe('/onboarding/profile-completion/tenant');
  });

  it('sends complete users to the home tab', () => {
    expect(getPostAuthRoute({ role: ['Tenant'] } as never)).toBe('/(app)/(home)');
  });
});
