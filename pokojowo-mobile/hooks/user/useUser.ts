import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService, profileService } from '@/services';
import type { UserUpdateData, ReportReason } from '@/services/user.service';
import { AUTH_KEYS } from '../auth/useAuth';
import useAuthStore from '@/stores/authStore';

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

/**
 * Uploads a locally-picked image and then persists the returned hosted URL on
 * the current user's profile. Resolves with the new photo URL.
 */
export function useUploadProfilePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uri: string) => {
      const uploadRes = await profileService.uploadPhoto(uri);
      const url = uploadRes.data.url;
      await profileService.setPhoto(url);
      return url;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.user });
    },
  });
}

export function useReportUser() {
  return useMutation({
    mutationFn: ({
      userId,
      reason,
      details,
    }: {
      userId: string;
      reason: ReportReason;
      details?: string;
    }) => userService.reportUser(userId, reason, details),
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => userService.blockUser(userId),
    onSuccess: (response, userId) => {
      const blockedUsers = response.data.blocked_users ?? response.data.blockedUsers;
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        useAuthStore.getState().updateUser({
          chat_settings: {
            ...currentUser.chat_settings,
            blocked_users: blockedUsers ?? [
              ...(currentUser.chat_settings?.blocked_users ?? []),
              userId,
            ],
          },
        });
      }
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.user });
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => userService.unblockUser(userId),
    onSuccess: (_response, userId) => {
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        useAuthStore.getState().updateUser({
          chat_settings: {
            ...currentUser.chat_settings,
            blocked_users: (currentUser.chat_settings?.blocked_users ?? []).filter(
              (blockedUserId) => blockedUserId !== userId
            ),
          },
        });
      }
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.user });
    },
  });
}
