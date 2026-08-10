import api from '@/lib/api';

const FAVORITES_BASE_URL = '/favorites';

/**
 * API operations for saved flatmate profiles.
 * Components and hooks should use this service instead of calling Axios
 * directly so the response mapping stays in one place.
 */
export const favoritesService = {
  getSavedMatches: async ({ limit = 50, offset = 0 } = {}) => {
    const response = await api.get(`${FAVORITES_BASE_URL}/`, {
      params: { limit, offset },
    });
    return response.data;
  },

  saveMatch: async (userId, notes = null) => {
    const response = await api.post(`${FAVORITES_BASE_URL}/${userId}`, null, {
      params: notes ? { notes } : {},
    });
    return response.data;
  },

  removeSaved: async (userId) => {
    const response = await api.delete(`${FAVORITES_BASE_URL}/${userId}`);
    return response.data;
  },

  checkIfSaved: async (userId) => {
    const response = await api.get(`${FAVORITES_BASE_URL}/check/${userId}`);
    return response.data.is_saved;
  },

  updateNotes: async (userId, notes) => {
    const response = await api.patch(`${FAVORITES_BASE_URL}/${userId}/notes`, null, {
      params: { notes },
    });
    return response.data;
  },

  getSavedCount: async () => {
    const response = await api.get(`${FAVORITES_BASE_URL}/count`);
    return response.data.count;
  },
};

export default favoritesService;
