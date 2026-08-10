import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import favoritesService from '@/services/favorites.service';

const DEFAULT_PAGE = { limit: 50, offset: 0 };

export const favoritesKeys = {
  all: ['favorites'],
  list: ({ limit = DEFAULT_PAGE.limit, offset = DEFAULT_PAGE.offset } = {}) => [
    ...favoritesKeys.all,
    'list',
    { limit, offset },
  ],
  check: (userId) => [...favoritesKeys.all, 'check', userId],
  count: () => [...favoritesKeys.all, 'count'],
};

/**
 * Read the saved profiles from the server. The same query key is shared by
 * the saved-profiles page and SaveButton, so a page with many cards still
 * performs one request and every button observes the same cache.
 */
export function useSavedMatches({ limit = DEFAULT_PAGE.limit, offset = DEFAULT_PAGE.offset } = {}) {
  const query = useQuery({
    queryKey: favoritesKeys.list({ limit, offset }),
    queryFn: () => favoritesService.getSavedMatches({ limit, offset }),
  });

  return {
    ...query,
    savedMatches: query.data?.saved_matches || [],
    savedCount: query.data?.total || 0,
  };
}

/** Read whether a profile is in the current user's saved list. */
export function useIsSaved(userId) {
  const { savedMatches, ...query } = useSavedMatches();
  return {
    ...query,
    isSaved: savedMatches.some((match) => match.user_id === userId),
  };
}

function invalidateFavorites(queryClient) {
  queryClient.invalidateQueries({ queryKey: favoritesKeys.all });
}

export function useSaveMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, notes }) => favoritesService.saveMatch(userId, notes),
    onSuccess: (_, { userId }) => {
      queryClient.setQueryData(favoritesKeys.check(userId), true);
      invalidateFavorites(queryClient);
    },
  });
}

export function useRemoveSaved() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId }) => favoritesService.removeSaved(userId),
    onSuccess: (_, { userId }) => {
      queryClient.setQueryData(favoritesKeys.check(userId), false);
      invalidateFavorites(queryClient);
    },
  });
}

export function useUpdateSavedNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, notes }) => favoritesService.updateNotes(userId, notes),
    onSuccess: () => invalidateFavorites(queryClient),
  });
}
