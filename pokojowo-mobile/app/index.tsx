import { Redirect } from 'expo-router';
import useAuthStore from '@/stores/authStore';
import useUIStore from '@/stores/uiStore';
import { getPostAuthRoute } from '@/lib/onboardingRoute';

export default function Index() {
  const { isAuthenticated, user } = useAuthStore();
  const hasSeenWelcome = useUIStore((s) => s.hasSeenWelcome);

  if (!isAuthenticated) {
    // First-run visitors see the welcome carousel before the auth screens.
    return <Redirect href={hasSeenWelcome ? '/(auth)/login' : '/onboarding'} />;
  }

  // Authenticated: route based on onboarding progress (role + profile).
  return <Redirect href={getPostAuthRoute(user)} />;
}
