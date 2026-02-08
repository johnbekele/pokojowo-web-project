import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { likesService } from '@/services';
import { MATCHING_KEYS } from '../matching/useMatching';

export const LIKES_KEYS = {
  all: ['likes'] as const,
  sent: ['likes', 'sent'] as const,
  received: ['likes', 'received'] as const,
  mutual: ['likes', 'mutual'] as const,
  status: (userId: string) => ['likes', 'status', userId] as const,
  stats: ['likes', 'stats'] as const,
};

export function useLikesSent(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: [...LIKES_KEYS.sent, params],
    queryFn: async () => {
      const response = await likesService.getLikesSent(params);
      return response.data;
    },
  });
}

export function useLikesReceived(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: [...LIKES_KEYS.received, params],
    queryFn: async () => {
      const response = await likesService.getLikesReceived(params);
      return response.data;
    },
  });
}

export function useMutualMatches(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: [...LIKES_KEYS.mutual, params],
    queryFn: async () => {
      const response = await likesService.getMutualMatches(params);
      return response.data;
    },
  });
}

export function useLikeStatus(userId: string) {
  return useQuery({
    queryKey: LIKES_KEYS.status(userId),
    queryFn: async () => {
      const response = await likesService.checkLikeStatus(userId);
      return response.data;
    },
    enabled: !!userId,
  });
}

export function useLikesStats() {
  return useQuery({
    queryKey: LIKES_KEYS.stats,
    queryFn: async () => {
      const response = await likesService.getStats();
      return response.data;
    },
  });
}

export function useLikeUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => likesService.likeUser(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: LIKES_KEYS.all });
      queryClient.invalidateQueries({ queryKey: LIKES_KEYS.status(userId) });
      queryClient.invalidateQueries({ queryKey: MATCHING_KEYS.dashboard });
    },
  });
}

export function useUnlikeUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => likesService.unlikeUser(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: LIKES_KEYS.all });
      queryClient.invalidateQueries({ queryKey: LIKES_KEYS.status(userId) });
      queryClient.invalidateQueries({ queryKey: MATCHING_KEYS.dashboard });
    },
  });
}

export function useUnmatchUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => likesService.unmatchUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIKES_KEYS.all });
      queryClient.invalidateQueries({ queryKey: MATCHING_KEYS.dashboard });
    },
  });
}
