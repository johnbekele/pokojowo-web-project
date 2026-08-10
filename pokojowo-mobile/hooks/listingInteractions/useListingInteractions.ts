import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listingInteractionService } from '@/services';
import type { ListingInteraction } from '@/services/listingInteraction.service';

export const INTERACTION_KEYS = {
  all: ['listing-interactions'] as const,
  myInteractions: (listingId: string) =>
    ['listing-interactions', 'my', listingId] as const,
  myLiked: ['listing-interactions', 'liked'] as const,
  interestedUsers: (listingId: string) =>
    ['listing-interactions', 'interested', listingId] as const,
  stats: (listingId: string) =>
    ['listing-interactions', 'stats', listingId] as const,
};

export function useTrackView(listingId: string | undefined) {
  return useMutation({
    mutationFn: (durationSeconds?: number) =>
      listingInteractionService.trackView(listingId!, durationSeconds),
  });
}

export function useMyInteractions(listingId: string | undefined) {
  return useQuery({
    queryKey: INTERACTION_KEYS.myInteractions(listingId!),
    queryFn: async () => {
      const response = await listingInteractionService.getMyInteractions(listingId!);
      return response.data;
    },
    enabled: !!listingId,
  });
}

export function useLikeListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listingId: string) =>
      listingInteractionService.likeListing(listingId),
    onMutate: async (listingId) => {
      await queryClient.cancelQueries({
        queryKey: INTERACTION_KEYS.myInteractions(listingId),
      });
      const previous = queryClient.getQueryData<ListingInteraction>(
        INTERACTION_KEYS.myInteractions(listingId)
      );
      queryClient.setQueryData<ListingInteraction | undefined>(
        INTERACTION_KEYS.myInteractions(listingId),
        (old) => ({
          has_viewed: old?.has_viewed ?? false,
          has_liked: true,
          has_inquired: old?.has_inquired ?? false,
        })
      );
      return { previous };
    },
    onError: (_error, listingId, context) => {
      queryClient.setQueryData(
        INTERACTION_KEYS.myInteractions(listingId),
        context?.previous
      );
    },
    onSettled: (_data, _error, listingId) => {
      queryClient.invalidateQueries({
        queryKey: INTERACTION_KEYS.myInteractions(listingId),
      });
      queryClient.invalidateQueries({ queryKey: INTERACTION_KEYS.myLiked });
    },
  });
}

export function useUnlikeListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listingId: string) =>
      listingInteractionService.unlikeListing(listingId),
    onMutate: async (listingId) => {
      await queryClient.cancelQueries({
        queryKey: INTERACTION_KEYS.myInteractions(listingId),
      });
      const previous = queryClient.getQueryData<ListingInteraction>(
        INTERACTION_KEYS.myInteractions(listingId)
      );
      queryClient.setQueryData<ListingInteraction | undefined>(
        INTERACTION_KEYS.myInteractions(listingId),
        (old) => ({
          has_viewed: old?.has_viewed ?? false,
          has_liked: false,
          has_inquired: old?.has_inquired ?? false,
        })
      );
      return { previous };
    },
    onError: (_error, listingId, context) => {
      queryClient.setQueryData(
        INTERACTION_KEYS.myInteractions(listingId),
        context?.previous
      );
    },
    onSettled: (_data, _error, listingId) => {
      queryClient.invalidateQueries({
        queryKey: INTERACTION_KEYS.myInteractions(listingId),
      });
      queryClient.invalidateQueries({ queryKey: INTERACTION_KEYS.myLiked });
    },
  });
}

export function useMyLikedListings() {
  return useQuery({
    queryKey: INTERACTION_KEYS.myLiked,
    queryFn: async () => {
      const response = await listingInteractionService.getMyLikedListings();
      return response.data;
    },
  });
}

export function useInterestedUsers(
  listingId: string | undefined,
  options?: { minCompatibility?: number; limit?: number }
) {
  return useQuery({
    queryKey: [...INTERACTION_KEYS.interestedUsers(listingId!), options],
    queryFn: async () => {
      const response = await listingInteractionService.getInterestedUsers(
        listingId!,
        options
      );
      return response.data;
    },
    enabled: !!listingId,
  });
}

export function useListingStats(listingId: string | undefined) {
  return useQuery({
    queryKey: INTERACTION_KEYS.stats(listingId!),
    queryFn: async () => {
      const response = await listingInteractionService.getListingStats(listingId!);
      return response.data;
    },
    enabled: !!listingId,
  });
}
