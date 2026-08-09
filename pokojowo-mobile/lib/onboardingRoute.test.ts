import { getPostAuthRoute } from './onboardingRoute';

describe('post-auth onboarding route', () => {
  it('returns the login route when no user is available', () => {
    expect(getPostAuthRoute(null)).toBe('/(auth)/login');
  });

  it('sends users without a role to role selection', () => {
    expect(getPostAuthRoute({ role: [] } as never)).toBe('/onboarding/role');
  });

  it('sends incomplete landlords to landlord profile completion', () => {
    expect(getPostAuthRoute({
      role: ['Landlord'],
      profile_completion: { completed: false },
    } as never)).toBe('/onboarding/profile-completion/landlord');
  });

  it('sends complete users to the home tab', () => {
    expect(getPostAuthRoute({ role: ['Tenant'] } as never)).toBe('/(app)/(home)');
  });
});
