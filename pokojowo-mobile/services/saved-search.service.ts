import api from '@/lib/api';
import type { CreateSavedSearch, SavedSearch } from '@/types/saved-search.types';

export const savedSearchService = {
  list: () => api.get<SavedSearch[]>('/saved-searches/'),
  get: (id: string) => api.get<SavedSearch>(`/saved-searches/${id}`),
  create: (data: CreateSavedSearch) => api.post<SavedSearch>('/saved-searches/', data),
  update: (id: string, data: { name?: string; notifyEnabled?: boolean }) =>
    api.patch<SavedSearch>(`/saved-searches/${id}`, data),
  remove: (id: string) => api.delete(`/saved-searches/${id}`),
};

export default savedSearchService;
