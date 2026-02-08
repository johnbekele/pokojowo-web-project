import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services';
import type { UserUpdateData } from '@/services/user.service';
import { AUTH_KEYS } from '../auth/useAuth';

export const USER_KEYS = {
  all: ['users'] as const,
  detail: (userId: string) => ['users', userId] as const,
  list: (params?: Record<string, unknown>) => ['users', 'list', params] as const,
};

export function useUser(userId: string) {
  return useQuery({
    queryKey: USER_KEYS.detail(userId),
    queryFn: async () => {
      const response = await userService.getUserById(userId);
      return response.data;
    },
    enabled: !!userId,
  });
}

export function useUsers(params?: { skip?: number; limit?: number; role?: string }) {
  return useQuery({
    queryKey: USER_KEYS.list(params),
    queryFn: async () => {
      const response = await userService.getUsers(params);
      return response.data;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UserUpdateData) => userService.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.user });
    },
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () => userService.deleteAccount(),
  });
}
