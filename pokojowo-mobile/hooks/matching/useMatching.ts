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
      const data = response.data;

      // Transform flat match results to include nested user object
      // Backend returns: { user_id, username, photo, ... }
      // Mobile expects: { user_id, user: { id, username, photo, ... }, ... }
      if (data?.matches) {
        data.matches = data.matches.map((match: Record<string, unknown>) => ({
          ...match,
          user: {
            id: match.user_id,
            _id: match.user_id,
            username: match.username,
            firstname: match.firstname,
            lastname: match.lastname,
            photo: match.photo,
            age: match.age,
            gender: match.gender,
            bio: match.bio,
            location: match.location,
            languages: match.languages,
            job: match.job,
          },
        }));
      }

      return data;
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
