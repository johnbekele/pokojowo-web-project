import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '@/stores/authStore';
import LoadingPage from './LoadingPage';

// Routes that don't require profile completion
const PROFILE_COMPLETION_ROUTES = [
  '/profile-completion',
  '/select-role',
  '/welcome',
];

/**
 * Protected route wrapper that redirects to login if not authenticated
 * and to profile completion if profile is incomplete
 */
export default function ProtectedRoute({ children, requiredRole, skipProfileCheck = false }) {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const location = useLocation();

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingPage />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if current route is a profile completion route
  const isProfileCompletionRoute = PROFILE_COMPLETION_ROUTES.some(
    route => location.pathname.startsWith(route)
  );

  // If user hasn't selected a role yet, redirect to role selection
  if (user && (!user.role || user.role.length === 0 || (user.role.length === 1 && user.role[0] === 'User'))) {
    if (!isProfileCompletionRoute && location.pathname !== '/select-role') {
      return <Navigate to="/select-role" replace />;
    }
  }

  // Check if profile needs completion (skip for profile completion routes)
  if (!skipProfileCheck && !isProfileCompletionRoute && user && !user.isProfileComplete) {
    const isTenant = user.role?.includes('Tenant') || user.role?.includes('tenant');
    const isLandlord = user.role?.includes('Landlord') || user.role?.includes('landlord');

    if (isTenant) {
      return <Navigate to="/profile-completion/tenant" replace />;
    } else if (isLandlord) {
      return <Navigate to="/profile-completion/landlord" replace />;
    }
  }

  // Check for required role if specified. A user with no role array must fail
  // this rather than skip it, which is what the previous `&& user?.role` did.
  if (requiredRole) {
    const roles = (user?.role || []).map((r) => r.toLowerCase());
    if (!roles.includes(requiredRole.toLowerCase())) {
      // Somewhere they can actually use, and it does not confirm this route
      // exists. Always a route the user's own role grants, so it cannot loop.
      return <Navigate to={homeForRoles(roles)} replace />;
    }
  }

  return children || <Outlet />;
}

function homeForRoles(roles) {
  if (roles.includes('landlord')) return '/landlord/dashboard';
  if (roles.includes('tenant')) return '/likes';
  return '/';
}
