import { Redirect } from 'expo-router';
import useAuthStore from '@/stores/authStore';

export default function Index() {
  const { isAuthenticated } = useAuthStore();

  // Redirect based on auth state
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // User is authenticated, go to main app
  return <Redirect href="/(app)/(home)" />;
}
