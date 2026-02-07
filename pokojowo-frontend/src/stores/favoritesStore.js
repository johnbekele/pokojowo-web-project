import { create } from 'zustand';
import api from '@/lib/api';

/**
 * Favorites store for managing saved/bookmarked matches
 */
const useFavoritesStore = create((set, get) => ({
  // State
  savedMatches: [],
  savedCount: 0,
  isLoading: false,
  error: null,
  // Track saved user IDs for quick lookup
  savedUserIds: new Set(),

  // Fetch all saved matches
  fetchSavedMatches: async (limit = 50, offset = 0) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/favorites/', {
        params: { limit, offset }
      });
      const savedIds = new Set(response.data.saved_matches.map(m => m.user_id));
      set({
        savedMatches: response.data.saved_matches,
        savedCount: response.data.total,
        savedUserIds: savedIds,
        isLoading: false
      });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to fetch saved matches';
      set({ isLoading: false, error: message });
      return null;
    }
  },

  // Save a match
  saveMatch: async (userId, notes = null) => {
    try {
      const response = await api.post(`/favorites/${userId}`, null, {
        params: notes ? { notes } : {}
      });

      if (response.data.status === 'saved' || response.data.status === 'already_saved') {
        set((state) => ({
          savedUserIds: new Set([...state.savedUserIds, userId]),
          savedCount: state.savedCount + (response.data.status === 'saved' ? 1 : 0)
        }));
      }

      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to save match';
      return { success: false, error: message };
    }
  },

  // Remove saved match
  removeSaved: async (userId) => {
    try {
      await api.delete(`/favorites/${userId}`);

      set((state) => {
        const newSavedIds = new Set(state.savedUserIds);
        newSavedIds.delete(userId);
        return {
          savedUserIds: newSavedIds,
          savedMatches: state.savedMatches.filter(m => m.user_id !== userId),
          savedCount: Math.max(0, state.savedCount - 1)
        };
      });

      return { success: true };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to remove saved match';
      return { success: false, error: message };
    }
  },

  // Check if user is saved
  isSaved: (userId) => {
    return get().savedUserIds.has(userId);
  },

  // Check if user is saved (API call)
  checkIfSaved: async (userId) => {
    try {
      const response = await api.get(`/favorites/check/${userId}`);
      return response.data.is_saved;
    } catch {
      return false;
    }
  },

  // Toggle save status
  toggleSave: async (userId) => {
    if (get().isSaved(userId)) {
      return await get().removeSaved(userId);
    } else {
      return await get().saveMatch(userId);
    }
  },

  // Update notes for a saved match
  updateNotes: async (userId, notes) => {
    try {
      const response = await api.patch(`/favorites/${userId}/notes`, null, {
        params: { notes }
      });

      set((state) => ({
        savedMatches: state.savedMatches.map(m =>
          m.user_id === userId ? { ...m, notes } : m
        )
      }));

      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to update notes';
      return { success: false, error: message };
    }
  },

  // Get saved count
  fetchSavedCount: async () => {
    try {
      const response = await api.get('/favorites/count');
      set({ savedCount: response.data.count });
      return response.data.count;
    } catch {
      return 0;
    }
  },

  // Clear store
  clear: () => {
    set({
      savedMatches: [],
      savedCount: 0,
      savedUserIds: new Set(),
      error: null
    });
  }
}));

export default useFavoritesStore;
