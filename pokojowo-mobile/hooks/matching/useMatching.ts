import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { matchingService } from '@/services';
import type { MatchingFilters } from '@/types/matching.types';

export const MATCHING_KEYS = {
  all: ['matching'] as const,
  matches: (filters?: MatchingFilters) => [...MATCHING_KEYS.all, 'list', filters] as const,
  match: (userId: string) => [...MATCHING_KEYS.all, 'user', userId] as const,
  stats: ['matching', 'stats'] as const,
  dashboard: ['matching', 'dashboard'] as const,
};

export function useMatches(filters?: MatchingFilters) {
  return useQuery({
    queryKey: MATCHING_KEYS.matches(filters),
    queryFn: async () => {
      const response = await matchingService.getMatches(filters);
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useMatchWithUser(userId: string) {
  return useQuery({
    queryKey: MATCHING_KEYS.match(userId),
    queryFn: async () => {
      const response = await matchingService.getMatchWithUser(userId);
      return response.data;
    },
    enabled: !!userId,
  });
}

export function useMatchingStats() {
  return useQuery({
    queryKey: MATCHING_KEYS.stats,
    queryFn: async () => {
      const response = await matchingService.getStats();
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useDashboard() {
  return useQuery({
    queryKey: MATCHING_KEYS.dashboard,
    queryFn: async () => {
      const response = await matchingService.getDashboard();
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useRefreshMatches() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => matchingService.refreshMatches(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATCHING_KEYS.all });
    },
  });
}
