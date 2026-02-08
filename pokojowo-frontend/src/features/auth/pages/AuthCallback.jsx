import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import useAuthStore from '@/stores/authStore';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleOAuthCallback, fetchUser } = useAuthStore();
  const [error, setError] = useState(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get token from URL params (handle both snake_case and camelCase)
        const token = searchParams.get('token');
        const refreshToken = searchParams.get('refresh_token') || searchParams.get('refreshToken');
        const isNewUser = searchParams.get('is_new_user') === 'true' || searchParams.get('isNewUser') === 'true';
        const requiresProfileCompletion = searchParams.get('requiresProfileCompletion') === 'true';

        if (!token) {
          const errorMessage = searchParams.get('error');
          throw new Error(errorMessage || 'Authentication failed');
        }

        // Store tokens and fetch user
        await handleOAuthCallback(token, refreshToken);
        const user = await fetchUser();

        // Determine where to redirect
        if (isNewUser || !user?.role || user.role.length === 0 || (user.role.length === 1 && user.role[0] === 'User')) {
          // New user needs to select role
          navigate('/select-role', { replace: true });
        } else if (requiresProfileCompletion || !user?.isProfileComplete) {
          // User needs to complete profile
          const role = user.role.some(r => r.toLowerCase() === 'landlord') ? 'landlord' : 'tenant';
          navigate(`/profile-completion/${role}`, { replace: true });
        } else {
          // Existing user with complete profile
          navigate('/', { replace: true });
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(err.message);
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    processCallback();
  }, [searchParams, handleOAuthCallback, fetchUser, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive">Authentication Error</h2>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <p className="mt-4 text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
