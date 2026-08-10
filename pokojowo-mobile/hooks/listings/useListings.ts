import { useInfiniteQuery, useQueries, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listingService, listingInteractionService } from '@/services';
import type { ListingFilters, CreateListingData, ListingPage } from '@/types/listing.types';

const LISTING_PAGE_SIZE = 20;

export function useListings(filters?: ListingFilters) {
  const query = useInfiniteQuery({
    queryKey: ['listings', filters],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listingService.getListingsPage(filters, pageParam, LISTING_PAGE_SIZE).then((res) => res.data),
    getNextPageParam: (lastPage: ListingPage) =>
      lastPage.hasMore ? lastPage.skip + lastPage.listings.length : undefined,
  });

  return {
    ...query,
    data: query.data?.pages.flatMap((page) => page.listings) ?? [],
    total: query.data?.pages[0]?.total ?? 0,
  };
}

export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingService.getListing(id!).then((res) => res.data),
    enabled: !!id,
  });
}

export function useMyListings() {
  return useQuery({
    queryKey: ['my-listings'],
    queryFn: () => listingService.getMyListings().then((res) => res.data),
  });
}

export function useCreateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateListingData) =>
      listingService.createListing(data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
    },
  });
}

export function useUpdateListing(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<CreateListingData>) =>
      listingService.updateListing(id, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listing', id] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
    },
  });
}

export function useDeleteListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => listingService.deleteListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
    },
  });
}

export function useUploadListingImages() {
  return useMutation({
    mutationFn: (uris: string[]) =>
      listingService.uploadImages(uris).then((res) => res.data.files.map((f) => f.url)),
  });
}

/**
 * Aggregates per-listing interaction stats (views/likes/inquiries) across the
 * given listing ids using parallel queries, so the landlord dashboard can show
 * real totals instead of zeros.
 */
export function useLandlordStats(listingIds: string[]) {
  const results = useQueries({
    queries: listingIds.map((id) => ({
      queryKey: ['listing-stats', id],
      queryFn: () => listingInteractionService.getListingStats(id).then((res) => res.data),
      staleTime: 60 * 1000,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const totals = results.reduce(
    (acc, r) => {
      if (r.data) {
        acc.views += r.data.total_views || 0;
        acc.likes += r.data.total_likes || 0;
        acc.inquiries += r.data.total_inquiries || 0;
      }
      return acc;
    },
    { views: 0, likes: 0, inquiries: 0 }
  );

  return { totals, isLoading };
}
