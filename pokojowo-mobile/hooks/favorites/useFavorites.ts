import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { favoritesService } from '@/services';

export const FAVORITES_KEYS = {
  all: ['favorites'] as const,
  users: ['favorites', 'users'] as const,
  listings: ['favorites', 'listings'] as const,
  userSaved: (userId: string) => ['favorites', 'users', 'check', userId] as const,
  listingSaved: (listingId: string) => ['favorites', 'listings', 'check', listingId] as const,
};

export function useSavedUsers(params?: { skip?: number; limit?: number }) {
  return useQuery({
    queryKey: [...FAVORITES_KEYS.users, params],
    queryFn: async () => {
      const response = await favoritesService.getSavedUsers(params);
      return response.data;
    },
  });
}

export function useSavedListings(params?: { skip?: number; limit?: number }) {
  return useQuery({
    queryKey: [...FAVORITES_KEYS.listings, params],
    queryFn: async () => {
      const response = await favoritesService.getSavedListings(params);
      return response.data;
    },
  });
}

export function useIsUserSaved(userId: string) {
  return useQuery({
    queryKey: FAVORITES_KEYS.userSaved(userId),
    queryFn: async () => {
      const response = await favoritesService.isUserSaved(userId);
      return response.data.is_saved;
    },
    enabled: !!userId,
  });
}

export function useIsListingSaved(listingId: string) {
  return useQuery({
    queryKey: FAVORITES_KEYS.listingSaved(listingId),
    queryFn: async () => {
      const response = await favoritesService.isListingSaved(listingId);
      return response.data.is_saved;
    },
    enabled: !!listingId,
  });
}

export function useSaveUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => favoritesService.saveUser(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: FAVORITES_KEYS.users });
      queryClient.setQueryData(FAVORITES_KEYS.userSaved(userId), true);
    },
  });
}

export function useUnsaveUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => favoritesService.unsaveUser(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: FAVORITES_KEYS.users });
      queryClient.setQueryData(FAVORITES_KEYS.userSaved(userId), false);
    },
  });
}

export function useSaveListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listingId: string) => favoritesService.saveListing(listingId),
    onSuccess: (_, listingId) => {
      queryClient.invalidateQueries({ queryKey: FAVORITES_KEYS.listings });
      queryClient.setQueryData(FAVORITES_KEYS.listingSaved(listingId), true);
    },
  });
}

export function useUnsaveListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listingId: string) => favoritesService.unsaveListing(listingId),
    onSuccess: (_, listingId) => {
      queryClient.invalidateQueries({ queryKey: FAVORITES_KEYS.listings });
      queryClient.setQueryData(FAVORITES_KEYS.listingSaved(listingId), false);
    },
  });
}
