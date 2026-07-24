import { create } from 'zustand';
import api, { normalizeError } from '@/lib/api';

/**
 * Saved-searches store — CRUD for a user's persisted /discover filter sets.
 *
 * Talks to the `/saved-searches/` backend (issue #73). The API body/response
 * are camelCase (minPrice, roomTypes, notifyEnabled…); callers pass those
 * shapes straight through. Errors are normalized so screens can surface the
 * server detail (e.g. the per-user limit-reached 400).
 */
const useSavedSearchStore = create((set, get) => ({
  // State
  savedSearches: [],
  isLoading: false,
  error: null,

  // Fetch all of the current user's saved searches (newest first).
  fetchSavedSearches: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/saved-searches/');
      set({ savedSearches: response.data, isLoading: false });
      return response.data;
    } catch (error) {
      const { message } = normalizeError(error);
      set({ isLoading: false, error: message });
      return null;
    }
  },

  // Create a saved search from a camelCase body. Returns {success, data|error}.
  createSavedSearch: async (body) => {
    try {
      const response = await api.post('/saved-searches/', body);
      set((state) => ({ savedSearches: [response.data, ...state.savedSearches] }));
      return { success: true, data: response.data };
    } catch (error) {
      const { message } = normalizeError(error);
      return { success: false, error: message };
    }
  },

  // Update name/notifyEnabled on an existing search.
  updateSavedSearch: async (id, body) => {
    try {
      const response = await api.patch(`/saved-searches/${id}`, body);
      set((state) => ({
        savedSearches: state.savedSearches.map((s) =>
          s.id === id ? response.data : s
        ),
      }));
      return { success: true, data: response.data };
    } catch (error) {
      const { message } = normalizeError(error);
      return { success: false, error: message };
    }
  },

  // Delete a saved search.
  deleteSavedSearch: async (id) => {
    try {
      await api.delete(`/saved-searches/${id}`);
      set((state) => ({
        savedSearches: state.savedSearches.filter((s) => s.id !== id),
      }));
      return { success: true };
    } catch (error) {
      const { message } = normalizeError(error);
      return { success: false, error: message };
    }
  },

  // Clear store (e.g. on logout).
  clear: () => set({ savedSearches: [], error: null }),
}));

export default useSavedSearchStore;
