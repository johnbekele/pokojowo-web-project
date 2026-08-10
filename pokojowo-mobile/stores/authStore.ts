import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import api from '@/lib/api';
import { API_BASE_URL } from '@/lib/constants';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { connectChatSocket, disconnectChatSocket } from '@/lib/chatSocket';
import type { User, RegisterData } from '@/types/user.types';

// Complete any pending browser sessions
WebBrowser.maybeCompleteAuthSession();

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setTokens: (token: string, refreshToken?: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; canceled?: boolean; error?: string; user?: User | null }>;
  loginWithApple: () => Promise<{ success: boolean; canceled?: boolean; error?: string; user?: User | null }>;
  handleOAuthCallback: (token: string, refreshToken: string, userInfo?: User) => Promise<void>;
  fetchUser: () => Promise<User | null>;
  updateRole: (roles: string[]) => Promise<{ success: boolean; error?: string }>;
  updateUser: (userData: Partial<User>) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  hasRole: (role: string) => boolean;
  isTenant: () => boolean;
  isLandlord: () => boolean;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true, // Start with loading true for initialization
      error: null,

      // Actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setTokens: async (token, refreshToken) => {
        await storage.setItem(STORAGE_KEYS.TOKEN, token);
        if (refreshToken) {
          await storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        }
        set({ token, refreshToken, isAuthenticated: true });
        // Connect socket with the new token
        connectSocket(token);
        connectChatSocket(token);
      },

      clearAuth: async () => {
        // Disconnect socket before clearing auth
        disconnectSocket();
        disconnectChatSocket();
        await storage.removeItem(STORAGE_KEYS.TOKEN);
        await storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        await storage.removeItem(STORAGE_KEYS.USER);
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

          await get().setTokens(access_token, refresh_token);
          // Older backend builds omit `user` from the login payload; without it
          // the post-auth route resolver sends us straight back to login.
          const resolvedUser = user ?? (await get().fetchUser());
          set({ user: resolvedUser, isLoading: false });
          return { success: true, user: resolvedUser };
        } catch (error: unknown) {
          const axiosError = error as { response?: { data?: { detail?: string } } };
          const message = axiosError.response?.data?.detail || 'Login failed';
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      // Register new user
      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/register', userData);
          set({ isLoading: false });
          return { success: true, data: response.data };
        } catch (error: unknown) {
          const axiosError = error as { response?: { data?: { detail?: string } } };
          const message = axiosError.response?.data?.detail || 'Registration failed';
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      // Google OAuth - using Expo AuthSession + custom scheme deep link.
      // The backend `/auth/google` accepts a `mobile_redirect` param and, on
      // callback, redirects back to that custom scheme with the JWTs so the
      // in-app browser can hand them to us.
      loginWithGoogle: async () => {
        try {
          const redirectUri = AuthSession.makeRedirectUri({
            scheme: 'pokojowo',
            path: 'auth/callback',
          });
          const authUrl = `${API_BASE_URL}/auth/google?mobile_redirect=${encodeURIComponent(redirectUri)}`;

          const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

          if (result.type !== 'success' || !result.url) {
            // dismiss/cancel — return cleanly without touching auth state.
            return { success: false, canceled: true };
          }

          const url = new URL(result.url);
          const oauthError = url.searchParams.get('error');
          if (oauthError) {
            set({ error: oauthError });
            return { success: false, error: oauthError };
          }

          const token = url.searchParams.get('token');
          const refreshToken =
            url.searchParams.get('refresh_token') || url.searchParams.get('refreshToken');

          if (!token || !refreshToken) {
            const message = 'Google sign-in did not return tokens';
            set({ error: message });
            return { success: false, error: message };
          }

          await get().handleOAuthCallback(token, refreshToken);
          return { success: true, user: get().user };
        } catch (error) {
          console.error('Google OAuth error:', error);
          const message = 'Google sign-in failed';
          set({ error: message });
          return { success: false, error: message };
        }
      },

      // Apple Sign In - native flow. The identity token is verified server-side
      // by POST /auth/apple, which mints our own JWTs. Apple only returns the
      // user's name on the *first* authorization, so we forward it when present.
      loginWithApple: async () => {
        try {
          const AppleAuthentication = await import('expo-apple-authentication');
          const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
          });

          if (!credential.identityToken) {
            const message = 'Apple sign-in did not return a token';
            set({ error: message });
            return { success: false, error: message };
          }

          const { data } = await api.post('/auth/apple', {
            identity_token: credential.identityToken,
            firstname: credential.fullName?.givenName ?? undefined,
            lastname: credential.fullName?.familyName ?? undefined,
          });

          const token = data.access_token as string;
          const refreshToken = data.refresh_token as string;
          if (!token || !refreshToken) {
            const message = 'Apple sign-in did not return tokens';
            set({ error: message });
            return { success: false, error: message };
          }

          await get().handleOAuthCallback(token, refreshToken);
          return { success: true, user: get().user };
        } catch (error: unknown) {
          // User dismissed the native sheet.
          if ((error as { code?: string })?.code === 'ERR_REQUEST_CANCELED') {
            return { success: false, canceled: true };
          }
          const axiosError = error as { response?: { data?: { detail?: string } } };
          const message =
            axiosError.response?.data?.detail || 'Apple sign-in failed';
          console.error('Apple OAuth error:', error);
          set({ error: message });
          return { success: false, error: message };
        }
      },

      // Handle OAuth callback
      handleOAuthCallback: async (token, refreshToken, userInfo) => {
        await get().setTokens(token, refreshToken);
        if (userInfo) {
          set({ user: userInfo });
        }
        // Fetch full user data
        await get().fetchUser();
      },

      // Fetch current user
      fetchUser: async () => {
        const token = await storage.getItem(STORAGE_KEYS.TOKEN);
        if (!token) {
          set({ isLoading: false });
          return null;
        }

        set({ isLoading: true });
        try {
          const response = await api.get('/users/me');
          set({ user: response.data, isAuthenticated: true, isLoading: false });
          // Ensure socket is connected when user is fetched
          connectSocket(token);
        connectChatSocket(token);
          return response.data;
        } catch {
          await get().clearAuth();
          set({ isLoading: false });
          return null;
        }
      },

      // Update user role
      updateRole: async (roles) => {
        set({ isLoading: true, error: null });
        try {
          // Backend expects a single role string: 'tenant', 'landlord', or 'both'
          let role: string;
          if (roles.length === 2 || roles.includes('Both')) {
            role = 'both';
          } else {
            role = roles[0].toLowerCase();
          }

          const response = await api.put('/users/me/role', { role });
          const data = response.data.data || response.data;
          // Backend returns 'token' and 'refresh_token', not camelCase
          const accessToken = data.token || data.accessToken;
          const refreshToken = data.refresh_token || data.refreshToken;
          const user = data.user;

          if (accessToken) {
            await get().setTokens(accessToken, refreshToken);
          }
          set({ user, isLoading: false });
          return { success: true };
        } catch (error: unknown) {
          const axiosError = error as { response?: { data?: { detail?: string } } };
          const message = axiosError.response?.data?.detail || 'Failed to update role';
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      // Update user data locally
      updateUser: (userData) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : (userData as User),
        }));
      },

      // Logout
      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch {
          // Ignore logout errors
        }
        await get().clearAuth();
      },

      // Initialize - called on app start
      initialize: async () => {
        const token = await storage.getItem(STORAGE_KEYS.TOKEN);
        if (token) {
          set({ token, isAuthenticated: true });
          await get().fetchUser();
        } else {
          set({ isLoading: false });
        }
      },

      // Check if user has specific role
      hasRole: (role) => {
        const { user } = get();
        if (!user?.role) return false;
        return user.role.includes(role);
      },

      // Check if user is tenant
      isTenant: () => get().hasRole('Tenant'),

      // Check if user is landlord
      isLandlord: () => get().hasRole('Landlord'),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => ({
        getItem: async (name) => {
          const value = await storage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: async (name, value) => {
          await storage.setItem(name, JSON.stringify(value));
        },
        removeItem: async (name) => {
          await storage.removeItem(name);
        },
      })),
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
