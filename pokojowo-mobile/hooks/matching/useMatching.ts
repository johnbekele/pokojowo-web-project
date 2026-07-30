import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { matchingService } from '@/services';
import type { MatchingFilters, MatchResult } from '@/types/matching.types';

export const MATCHING_KEYS = {
  all: ['matching'] as const,
  matches: (filters?: MatchingFilters) => [...MATCHING_KEYS.all, 'list', filters] as const,
  match: (userId: string) => [...MATCHING_KEYS.all, 'user', userId] as const,
  stats: ['matching', 'stats'] as const,
  dashboard: ['matching', 'dashboard'] as const,
};

/**
 * The API returns a flat match record
 * (`{ user_id, username, photo, match_tier, explanations, ... }`) while the UI
 * expects the person nested under `user`. Every consumer of a match must go
 * through this, otherwise the profile fields silently render as undefined.
 */
function normalizeMatch(raw: unknown): MatchResult {
  const match = raw as MatchResult & Record<string, unknown>;
  return {
    // Keep all original fields (match_tier, explanations, shared_interests,
    // living_profile, ...)
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
  } as MatchResult;
}

export function useMatches(filters?: MatchingFilters) {
  return useQuery({
    queryKey: MATCHING_KEYS.matches(filters),
    queryFn: async () => {
      const response = await matchingService.getMatches(filters);
      const data = response.data;

      if (data?.matches) {
        data.matches = data.matches.map(normalizeMatch);
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
      return normalizeMatch(response.data);
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
