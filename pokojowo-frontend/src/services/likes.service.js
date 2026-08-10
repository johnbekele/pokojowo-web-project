import api from '@/lib/api';

const LIKES_BASE_URL = '/likes';

/** API operations for flatmate likes and mutual matches. */
export const likesService = {
  getLikesSent: async ({ limit = 50, offset = 0 } = {}) => {
    const response = await api.get(`${LIKES_BASE_URL}/sent`, {
      params: { limit, offset },
    });
    return response.data;
  },

  getLikesReceived: async ({ limit = 50, offset = 0 } = {}) => {
    const response = await api.get(`${LIKES_BASE_URL}/received`, {
      params: { limit, offset },
    });
    return response.data;
  },

  getMutualMatches: async ({ limit = 50, offset = 0 } = {}) => {
    const response = await api.get(`${LIKES_BASE_URL}/mutual`, {
      params: { limit, offset },
    });
    return response.data;
  },

  getStats: async () => {
    const response = await api.get(`${LIKES_BASE_URL}/stats`);
    return response.data;
  },

  getLikeStatus: async (userId) => {
    const response = await api.get(`${LIKES_BASE_URL}/check/${userId}`);
    return response.data;
  },

  likeUser: async (userId) => {
    const response = await api.post(`${LIKES_BASE_URL}/${userId}`);
    return response.data;
  },

  unlikeUser: async (userId) => {
    const response = await api.delete(`${LIKES_BASE_URL}/${userId}`);
    return response.data;
  },

  passUser: async (userId) => {
    const response = await api.post(`${LIKES_BASE_URL}/${userId}/pass`);
    return response.data;
  },

  undoPass: async (userId) => {
    const response = await api.delete(`${LIKES_BASE_URL}/${userId}/pass`);
    return response.data;
  },

  unmatch: async (userId) => {
    const response = await api.post(`${LIKES_BASE_URL}/${userId}/unmatch`);
    return response.data;
  },
};

export default likesService;
