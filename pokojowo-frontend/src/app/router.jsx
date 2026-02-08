import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import LoadingPage from '@/components/shared/LoadingPage';

// Lazy load pages for code splitting
const HomeListings = lazy(() => import('@/features/listings/pages/HomeListings'));
const ListingDetails = lazy(() => import('@/features/listings/pages/ListingDetails'));

const Login = lazy(() => import('@/features/auth/pages/Login'));
const Signup = lazy(() => import('@/features/auth/pages/Signup'));
const ForgotPassword = lazy(() => import('@/features/auth/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/features/auth/pages/ResetPassword'));
const VerifyEmail = lazy(() => import('@/features/auth/pages/VerifyEmail'));
const AuthCallback = lazy(() => import('@/features/auth/pages/AuthCallback'));
const SelectRole = lazy(() => import('@/features/auth/pages/SelectRole'));

const Profile = lazy(() => import('@/features/profile/pages/Profile'));
const ProfileCompletionTenant = lazy(() => import('@/features/profile/pages/ProfileCompletionTenant'));
const ProfileCompletionLandlord = lazy(() => import('@/features/profile/pages/ProfileCompletionLandlord'));
const TenantDashboard = lazy(() => import('@/features/profile/pages/TenantDashboard'));
const Welcome = lazy(() => import('@/features/profile/pages/Welcome'));

const Matches = lazy(() => import('@/features/matching/pages/Matches'));
const MatchDetail = lazy(() => import('@/features/matching/pages/MatchDetail'));

const ChatList = lazy(() => import('@/features/chat/pages/ChatList'));
const ChatRoom = lazy(() => import('@/features/chat/pages/ChatRoom'));

// Tenant pages
const LikesPage = lazy(() => import('@/features/tenant/pages/Dashboard'));
const SavedMatches = lazy(() => import('@/features/favorites/pages/SavedMatches'));

// Landlord pages
const LandlordDashboard = lazy(() => import('@/features/landlord/pages/LandlordDashboard'));
const CreateListing = lazy(() => import('@/features/landlord/pages/CreateListing'));
const MyListings = lazy(() => import('@/features/landlord/pages/MyListings'));

/**
 * Application routes
 */
export default function AppRouter() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Routes>
        {/* Public routes with layout */}
        <Route element={<PageLayout />}>
          <Route path="/" element={<HomeListings />} />
          <Route path="/discover" element={<HomeListings />} />
          <Route path="/listing/:id" element={<ListingDetails />} />
          <Route path="/tenant/:username" element={<TenantDashboard />} />
        </Route>

        {/* Auth routes (no header) */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/select-role" element={<SelectRole />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/profile-completion/tenant" element={<ProfileCompletionTenant />} />
          <Route path="/profile-completion/landlord" element={<ProfileCompletionLandlord />} />

          {/* Protected routes with layout */}
          <Route element={<PageLayout />}>
            <Route path="/profile" element={<Profile />} />
            {/* Tenant routes */}
            <Route path="/matches" element={<Matches />} />
            <Route path="/matches/:userId" element={<MatchDetail />} />
            <Route path="/favorites" element={<SavedMatches />} />
            <Route path="/likes" element={<LikesPage />} />
            {/* Redirect old dashboard route to likes */}
            <Route path="/dashboard" element={<Navigate to="/likes" replace />} />
            {/* Chat routes */}
            <Route path="/chat" element={<ChatList />} />
            <Route path="/chat/:chatId" element={<ChatRoom />} />
            <Route path="/chat/with/:userId" element={<ChatRoom />} />
            {/* Landlord routes */}
            <Route path="/landlord/dashboard" element={<LandlordDashboard />} />
            <Route path="/landlord/listings" element={<MyListings />} />
          </Route>

          {/* Landlord routes without layout */}
          <Route path="/landlord/listings/new" element={<CreateListing />} />
          <Route path="/landlord/listings/:id/edit" element={<CreateListing />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
