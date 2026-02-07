import { create } from 'zustand';
import api from '@/lib/api';

/**
 * Likes store for managing the mutual matching system
 */
const useLikesStore = create((set, get) => ({
  // State
  likesSent: [],
  likesReceived: [],
  mutualMatches: [],
  stats: {
    likes_sent: 0,
    likes_received: 0,
    mutual_matches: 0,
    pending_likes: 0
  },
  isLoading: false,
  error: null,
  // Track liked user IDs for quick lookup
  likedUserIds: new Set(),
  // Track who liked me
  likedByUserIds: new Set(),
  // Track mutual matches
  mutualUserIds: new Set(),
  // Show mutual match modal
  showMutualMatchModal: false,
  mutualMatchUser: null,

  // Like a user
  likeUser: async (userId) => {
    try {
      const response = await api.post(`/likes/${userId}`);

      set((state) => ({
        likedUserIds: new Set([...state.likedUserIds, userId]),
        stats: {
          ...state.stats,
          likes_sent: state.stats.likes_sent + 1
        }
      }));

      // Check if it's a mutual match
      if (response.data.is_mutual) {
        set((state) => ({
          mutualUserIds: new Set([...state.mutualUserIds, userId]),
          stats: {
            ...state.stats,
            mutual_matches: state.stats.mutual_matches + 1
          },
          showMutualMatchModal: true,
          mutualMatchUser: response.data.mutual_match
        }));
      }

      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to like user';
      return { success: false, error: message };
    }
  },

  // Unlike a user
  unlikeUser: async (userId) => {
    try {
      const response = await api.delete(`/likes/${userId}`);

      set((state) => {
        const newLikedIds = new Set(state.likedUserIds);
        newLikedIds.delete(userId);

        const newMutualIds = new Set(state.mutualUserIds);
        newMutualIds.delete(userId);

        return {
          likedUserIds: newLikedIds,
          mutualUserIds: newMutualIds,
          likesSent: state.likesSent.filter(l => l.liked_user_id !== userId),
          mutualMatches: state.mutualMatches.filter(m => m.matched_user_id !== userId),
          stats: {
            ...state.stats,
            likes_sent: Math.max(0, state.stats.likes_sent - 1),
            mutual_matches: response.data.was_mutual
              ? Math.max(0, state.stats.mutual_matches - 1)
              : state.stats.mutual_matches
          }
        };
      });

      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to unlike user';
      return { success: false, error: message };
    }
  },

  // Toggle like status
  toggleLike: async (userId) => {
    if (get().hasLiked(userId)) {
      return await get().unlikeUser(userId);
    } else {
      return await get().likeUser(userId);
    }
  },

  // Check if I liked a user
  hasLiked: (userId) => {
    return get().likedUserIds.has(userId);
  },

  // Check if we have a mutual match
  isMutualMatch: (userId) => {
    return get().mutualUserIds.has(userId);
  },

  // Fetch likes sent
  fetchLikesSent: async (limit = 50, offset = 0) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/likes/sent', {
        params: { limit, offset }
      });

      const likedIds = new Set(response.data.likes.map(l => l.liked_user_id));
      const mutualIds = new Set(
        response.data.likes
          .filter(l => l.status === 'mutual')
          .map(l => l.liked_user_id)
      );

      set({
        likesSent: response.data.likes,
        likedUserIds: likedIds,
        mutualUserIds: mutualIds,
        isLoading: false
      });

      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to fetch likes sent';
      set({ isLoading: false, error: message });
      return null;
    }
  },

  // Fetch likes received
  fetchLikesReceived: async (limit = 50, offset = 0) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/likes/received', {
        params: { limit, offset }
      });

      const likedByIds = new Set(response.data.likes.map(l => l.liker_id));

      set({
        likesReceived: response.data.likes,
        likedByUserIds: likedByIds,
        isLoading: false
      });

      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to fetch likes received';
      set({ isLoading: false, error: message });
      return null;
    }
  },

  // Fetch mutual matches
  fetchMutualMatches: async (limit = 50, offset = 0) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/likes/mutual', {
        params: { limit, offset }
      });

      const mutualIds = new Set(response.data.mutual_matches.map(m => m.matched_user_id));

      set({
        mutualMatches: response.data.mutual_matches,
        mutualUserIds: mutualIds,
        isLoading: false
      });

      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to fetch mutual matches';
      set({ isLoading: false, error: message });
      return null;
    }
  },

  // Check like status with another user
  checkLikeStatus: async (userId) => {
    try {
      const response = await api.get(`/likes/check/${userId}`);
      return response.data;
    } catch {
      return {
        i_liked: false,
        they_liked: false,
        is_mutual: false
      };
    }
  },

  // Unmatch with a user
  unmatch: async (userId) => {
    try {
      const response = await api.post(`/likes/${userId}/unmatch`);

      set((state) => {
        const newMutualIds = new Set(state.mutualUserIds);
        newMutualIds.delete(userId);

        return {
          mutualUserIds: newMutualIds,
          mutualMatches: state.mutualMatches.filter(m => m.matched_user_id !== userId),
          stats: {
            ...state.stats,
            mutual_matches: Math.max(0, state.stats.mutual_matches - 1)
          }
        };
      });

      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to unmatch';
      return { success: false, error: message };
    }
  },

  // Fetch stats
  fetchStats: async () => {
    try {
      const response = await api.get('/likes/stats');
      set({ stats: response.data });
      return response.data;
    } catch {
      return null;
    }
  },

  // Close mutual match modal
  closeMutualMatchModal: () => {
    set({ showMutualMatchModal: false, mutualMatchUser: null });
  },

  // Set mutual match data from real-time notification
  setMutualMatchData: (matchData) => {
    set((state) => ({
      showMutualMatchModal: true,
      mutualMatchUser: {
        matched_user_id: matchData.matchedUserId,
        user: {
          id: matchData.matchedUserId,
          firstname: matchData.matchedUserName?.split(' ')[0] || matchData.matchedUserName,
          lastname: matchData.matchedUserName?.split(' ').slice(1).join(' ') || '',
          photo: matchData.matchedUserPhoto
        }
      },
      mutualUserIds: new Set([...state.mutualUserIds, matchData.matchedUserId])
    }));
  },

  // Clear store
  clear: () => {
    set({
      likesSent: [],
      likesReceived: [],
      mutualMatches: [],
      stats: {
        likes_sent: 0,
        likes_received: 0,
        mutual_matches: 0,
        pending_likes: 0
      },
      likedUserIds: new Set(),
      likedByUserIds: new Set(),
      mutualUserIds: new Set(),
      error: null,
      showMutualMatchModal: false,
      mutualMatchUser: null
    });
  }
}));

export default useLikesStore;
