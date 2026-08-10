import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { savedSearchService } from '@/services';
import type { CreateSavedSearch } from '@/types/saved-search.types';

export const SAVED_SEARCH_KEYS = {
  all: ['saved-searches'] as const,
  list: ['saved-searches', 'list'] as const,
  detail: (id: string) => ['saved-searches', id] as const,
};

export function useSavedSearches() {
  return useQuery({
    queryKey: SAVED_SEARCH_KEYS.list,
    queryFn: () => savedSearchService.list().then((response) => response.data),
  });
}

export function useSavedSearch(id: string | undefined) {
  return useQuery({
    queryKey: SAVED_SEARCH_KEYS.detail(id || ''),
    queryFn: () => savedSearchService.get(id!).then((response) => response.data),
    enabled: Boolean(id),
  });
}

export function useCreateSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSavedSearch) => savedSearchService.create(data).then((response) => response.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SAVED_SEARCH_KEYS.all }),
  });
}

export function useUpdateSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; notifyEnabled?: boolean } }) =>
      savedSearchService.update(id, data).then((response) => response.data),
    onSuccess: (search) => {
      queryClient.setQueryData(SAVED_SEARCH_KEYS.detail(search.id), search);
      queryClient.invalidateQueries({ queryKey: SAVED_SEARCH_KEYS.list });
    },
  });
}

export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => savedSearchService.remove(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: SAVED_SEARCH_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: SAVED_SEARCH_KEYS.list });
    },
  });
}
