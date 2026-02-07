import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';

// API URL for OAuth redirects (must be set in production)
const API_URL = import.meta.env.VITE_API_URL;

/**
 * Auth store for managing authentication state
 */
const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setTokens: (token, refreshToken) => {
        localStorage.setItem('token', token);
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
        set({ token, refreshToken, isAuthenticated: true });
        // Connect socket with the new token
        connectSocket(token);
      },

      clearAuth: () => {
        // Disconnect socket before clearing auth
        disconnectSocket();
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      // Login with email/password
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/login', { email, password });
          const { access_token, refresh_token, user } = response.data;

          get().setTokens(access_token, refresh_token);
          set({ user, isLoading: false });
          return { success: true, user };
        } catch (error) {
          const message = error.response?.data?.detail || 'Login failed';
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      // Register new user
      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/register', userData);
          return { success: true, data: response.data };
        } catch (error) {
          const message = error.response?.data?.detail || 'Registration failed';
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        } finally {
          set({ isLoading: false });
        }
      },

      // Google OAuth
      loginWithGoogle: () => {
        // Use the API URL directly - it already includes /api prefix
        window.location.href = `${API_URL}/auth/google`;
      },

      // Handle OAuth callback
      handleOAuthCallback: async (token, refreshToken, userInfo) => {
        get().setTokens(token, refreshToken);
        if (userInfo) {
          set({ user: userInfo });
        }
        // Fetch full user data
        await get().fetchUser();
      },

      // Fetch current user
      fetchUser: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
          set({ isLoading: false });
          return null;
        }

        set({ isLoading: true });
        try {
          const response = await api.get('/users/me');
          set({ user: response.data, isAuthenticated: true, isLoading: false });
          // Ensure socket is connected when user is fetched (e.g., page reload)
          connectSocket(token);
          return response.data;
        } catch (error) {
          get().clearAuth();
          set({ isLoading: false });
          return null;
        }
      },

      // Update user role
      updateRole: async (role) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.put('/users/me/role', { role });
          const { accessToken, refreshToken, user } = response.data;

          if (accessToken) {
            get().setTokens(accessToken, refreshToken);
          }
          set({ user, isLoading: false });
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.detail || 'Failed to update role';
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      // Update user data locally
      updateUser: (userData) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : userData,
        }));
      },

      // Logout
      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch {
          // Ignore logout errors
        }
        get().clearAuth();
      },

      // Check if user has specific role
      hasRole: (role) => {
        const { user } = get();
        if (!user?.role) return false;
        return user.role.includes(role);
      },

      // Check if user is tenant
      isTenant: () => get().hasRole('tenant'),

      // Check if user is landlord
      isLandlord: () => get().hasRole('landlord'),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
