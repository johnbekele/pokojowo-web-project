import { create } from 'zustand';
import api from '@/lib/api';

interface SavedMatch {
  user_id: string;
  notes?: string;
  saved_at: string;
  user?: {
    id: string;
    username: string;
    firstname?: string;
    lastname?: string;
    photo?: string;
  };
}

interface FavoritesState {
  savedMatches: SavedMatch[];
  savedCount: number;
  isLoading: boolean;
  error: string | null;
  savedUserIds: Set<string>;

  fetchSavedMatches: (limit?: number, offset?: number) => Promise<{ saved_matches: SavedMatch[]; total: number } | null>;
  saveMatch: (userId: string, notes?: string | null) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  removeSaved: (userId: string) => Promise<{ success: boolean; error?: string }>;
  isSaved: (userId: string) => boolean;
  checkIfSaved: (userId: string) => Promise<boolean>;
  toggleSave: (userId: string) => Promise<{ success: boolean; error?: string }>;
  updateNotes: (userId: string, notes: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  fetchSavedCount: () => Promise<number>;
  clear: () => void;
}

const useFavoritesStore = create<FavoritesState>((set, get) => ({
  savedMatches: [],
  savedCount: 0,
  isLoading: false,
  error: null,
  savedUserIds: new Set<string>(),

  fetchSavedMatches: async (limit = 50, offset = 0) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/favorites/', {
        params: { limit, offset },
      });
      const savedIds = new Set<string>(response.data.saved_matches.map((m: SavedMatch) => m.user_id));
      set({
        savedMatches: response.data.saved_matches,
        savedCount: response.data.total,
        savedUserIds: savedIds,
        isLoading: false,
      });
      return response.data;
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { detail?: string } } };
      const message = axiosError.response?.data?.detail || 'Failed to fetch saved matches';
      set({ isLoading: false, error: message });
      return null;
    }
  },

  saveMatch: async (userId, notes = null) => {
    try {
      const response = await api.post(`/favorites/${userId}`, null, {
        params: notes ? { notes } : {},
      });

      if (response.data.status === 'saved' || response.data.status === 'already_saved') {
        set((state) => ({
          savedUserIds: new Set([...state.savedUserIds, userId]),
          savedCount: state.savedCount + (response.data.status === 'saved' ? 1 : 0),
        }));
      }

      return { success: true, data: response.data };
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { detail?: string } } };
      const message = axiosError.response?.data?.detail || 'Failed to save match';
      return { success: false, error: message };
    }
  },

  removeSaved: async (userId) => {
    try {
      await api.delete(`/favorites/${userId}`);

      set((state) => {
        const newSavedIds = new Set(state.savedUserIds);
        newSavedIds.delete(userId);
        return {
          savedUserIds: newSavedIds,
          savedMatches: state.savedMatches.filter((m) => m.user_id !== userId),
          savedCount: Math.max(0, state.savedCount - 1),
        };
      });

      return { success: true };
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { detail?: string } } };
      const message = axiosError.response?.data?.detail || 'Failed to remove saved match';
      return { success: false, error: message };
    }
  },

  isSaved: (userId) => {
    return get().savedUserIds.has(userId);
  },

  checkIfSaved: async (userId) => {
    try {
      const response = await api.get(`/favorites/check/${userId}`);
      return response.data.is_saved;
    } catch {
      return false;
    }
  },

  toggleSave: async (userId) => {
    if (get().isSaved(userId)) {
      return await get().removeSaved(userId);
    } else {
      return await get().saveMatch(userId);
    }
  },

  updateNotes: async (userId, notes) => {
    try {
      const response = await api.patch(`/favorites/${userId}/notes`, null, {
        params: { notes },
      });

      set((state) => ({
        savedMatches: state.savedMatches.map((m) =>
          m.user_id === userId ? { ...m, notes } : m
        ),
      }));

      return { success: true, data: response.data };
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { detail?: string } } };
      const message = axiosError.response?.data?.detail || 'Failed to update notes';
      return { success: false, error: message };
    }
  },

  fetchSavedCount: async () => {
    try {
      const response = await api.get('/favorites/count');
      set({ savedCount: response.data.count });
      return response.data.count;
    } catch {
      return 0;
    }
  },

  clear: () => {
    set({
      savedMatches: [],
      savedCount: 0,
      savedUserIds: new Set<string>(),
      error: null,
    });
  },
}));

export default useFavoritesStore;
