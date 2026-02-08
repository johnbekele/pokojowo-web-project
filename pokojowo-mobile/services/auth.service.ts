import api from '@/lib/api';
import type { User, RegisterData } from '@/types/user.types';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface RegisterResponse {
  message: string;
  user_id: string;
}

export const authService = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }),

  register: (userData: RegisterData) =>
    api.post<RegisterResponse>('/auth/register', userData),

  logout: () =>
    api.post('/auth/logout'),

  refreshToken: (refreshToken: string) =>
    api.post<{ access_token: string; refresh_token: string }>('/auth/refresh', {
      refresh_token: refreshToken,
    }),

  verifyEmail: (token: string) =>
    api.get(`/auth/verify-email/${token}`),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),

  resendVerification: (email: string) =>
    api.post('/auth/resend-verification', { email }),
};

export default authService;
