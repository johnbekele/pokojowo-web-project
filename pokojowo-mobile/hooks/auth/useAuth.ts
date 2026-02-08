import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService, userService } from '@/services';
import useAuthStore from '@/stores/authStore';
import type { RegisterData } from '@/types/user.types';

export const AUTH_KEYS = {
  user: ['auth', 'user'] as const,
};

export function useCurrentUser() {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: AUTH_KEYS.user,
    queryFn: async () => {
      const response = await userService.getMe();
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useLogin() {
  const { login } = useAuthStore();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: RegisterData) => authService.register(data),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      await logout();
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  const { updateRole } = useAuthStore();

  return useMutation({
    mutationFn: (roles: string[]) => updateRole(roles),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.user });
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      authService.resetPassword(token, password),
  });
}
