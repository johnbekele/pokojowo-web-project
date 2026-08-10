import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import listingInteractionService from '@/services/listingInteraction.service';

export const listingInteractionKeys = {
  all: ['listing-interactions'],
  myLiked: ['listing-interactions', 'my-liked'],
  myInteractions: (listingId) => ['listing-interactions', 'my', listingId],
  interestedUsers: (listingId, options) => [
    'listing-interactions',
    'interested',
    listingId,
    options,
  ],
  batchInterestedUsers: (listingIds, options) => [
    'listing-interactions',
    'interested-batch',
    listingIds,
    options,
  ],
  stats: (listingId) => ['listing-interactions', 'stats', listingId],
};

function listingIdEquals(left, right) {
  return String(left) === String(right);
}

function updateLikedListings(queryClient, listingId, liked) {
  const previous = queryClient.getQueryData(listingInteractionKeys.myLiked);
  const currentIds = previous?.likedListingIds || [];
  const nextIds = liked
    ? currentIds.some((id) => listingIdEquals(id, listingId))
      ? currentIds
      : [...currentIds, listingId]
    : currentIds.filter((id) => !listingIdEquals(id, listingId));

  queryClient.setQueryData(listingInteractionKeys.myLiked, {
    ...(previous || {}),
    likedListingIds: nextIds,
    count: nextIds.length,
  });

  return previous;
}

function useListingLikeMutation({ liked }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listingId) =>
      liked
        ? listingInteractionService.unlikeListing(listingId)
        : listingInteractionService.likeListing(listingId),
    onMutate: async (listingId) => {
      await queryClient.cancelQueries({ queryKey: listingInteractionKeys.myLiked });
      const previous = updateLikedListings(queryClient, listingId, !liked);
      return { previous, hadPrevious: previous !== undefined };
    },
    onError: (_error, _listingId, context) => {
      if (context?.hadPrevious) {
        queryClient.setQueryData(listingInteractionKeys.myLiked, context.previous);
      } else if (context) {
        queryClient.removeQueries({
          queryKey: listingInteractionKeys.myLiked,
          exact: true,
        });
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: listingInteractionKeys.myLiked }),
  });
}

/** Fetch the current user's liked listing IDs. */
export function useMyLikedListings({ enabled = true } = {}) {
  const query = useQuery({
    queryKey: listingInteractionKeys.myLiked,
    queryFn: () => listingInteractionService.getMyLikedListings(),
    enabled,
  });

  return {
    ...query,
    likedListingIds: query.data?.likedListingIds || [],
    likedCount: query.data?.count || 0,
  };
}

/** Read the current user's interactions for one listing. */
export function useMyListingInteractions(listingId, { enabled = true } = {}) {
  return useQuery({
    queryKey: listingInteractionKeys.myInteractions(listingId),
    queryFn: () => listingInteractionService.getMyInteractions(listingId),
    enabled: enabled && Boolean(listingId),
  });
}

/** Track a detail-page view without putting the event in client state. */
export function useTrackListingView() {
  return useMutation({
    mutationFn: ({ listingId, durationSeconds = null }) =>
      listingInteractionService.trackView(listingId, durationSeconds),
  });
}

/** Optimistic like mutation with cache rollback if the request fails. */
export function useLikeListing() {
  return useListingLikeMutation({ liked: false });
}

/** Optimistic unlike mutation with cache rollback if the request fails. */
export function useUnlikeListing() {
  return useListingLikeMutation({ liked: true });
}

/**
 * Consume one listing's like state and expose a single toggle operation.
 * Every card shares the same my-liked query, so a grid does not issue one
 * request per card.
 */
export function useListingLike(listingId, { enabled = true } = {}) {
  const likedQuery = useMyLikedListings({ enabled });
  const likeMutation = useLikeListing();
  const unlikeMutation = useUnlikeListing();
  const isLiked = likedQuery.likedListingIds.some((id) =>
    listingIdEquals(id, listingId),
  );

  return {
    ...likedQuery,
    isLiked,
    isPending: likeMutation.isPending || unlikeMutation.isPending,
    toggleLike: () =>
      isLiked
        ? unlikeMutation.mutateAsync(listingId)
        : likeMutation.mutateAsync(listingId),
  };
}

/** Fetch compatible users for a single listing. */
export function useInterestedUsers(
  listingId,
  { minCompatibility = 70, limit = 5 } = {},
  { enabled = true } = {},
) {
  const options = { minCompatibility, limit };
  return useQuery({
    queryKey: listingInteractionKeys.interestedUsers(listingId, options),
    queryFn: () => listingInteractionService.getInterestedUsers(listingId, options),
    enabled: enabled && Boolean(listingId),
  });
}

/** Fetch compatibility previews for all visible listing cards in one request. */
export function useBatchInterestedUsers(
  listingIds,
  { minCompatibility = 70, limitPerListing = 3 } = {},
  { enabled = true } = {},
) {
  const normalizedIds = Array.from(
    new Set((listingIds || []).filter(Boolean).map(String)),
  );
  const options = { minCompatibility, limitPerListing };
  const query = useQuery({
    queryKey: listingInteractionKeys.batchInterestedUsers(normalizedIds, options),
    queryFn: () =>
      listingInteractionService.getBatchInterestedUsers(normalizedIds, options),
    enabled: enabled && normalizedIds.length > 0,
  });

  return {
    ...query,
    usersByListing: query.data?.results || {},
  };
}

/** Fetch owner-only listing interaction statistics. */
export function useListingStats(listingId, { enabled = true } = {}) {
  return useQuery({
    queryKey: listingInteractionKeys.stats(listingId),
    queryFn: () => listingInteractionService.getListingStats(listingId),
    enabled: enabled && Boolean(listingId),
  });
}
