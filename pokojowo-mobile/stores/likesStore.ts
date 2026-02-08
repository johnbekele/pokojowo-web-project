import { create } from 'zustand';
import api from '@/lib/api';
import type { User } from '@/types/user.types';

interface Like {
  id: string;
  liker_id: string;
  liked_user_id: string;
  status: 'pending' | 'mutual' | 'unmatched';
  compatibility_score?: number;
  created_at: string;
  user?: User;
}

interface MutualMatch {
  id: string;
  matched_user_id: string;
  matched_at: string;
  user?: User;
}

interface LikesStats {
  likes_sent: number;
  likes_received: number;
  mutual_matches: number;
  pending_likes: number;
}

interface MutualMatchUser {
  matched_user_id: string;
  user: {
    id: string;
    firstname?: string;
    lastname?: string;
    photo?: string;
  };
}

interface LikesState {
  likesSent: Like[];
  likesReceived: Like[];
  mutualMatches: MutualMatch[];
  stats: LikesStats;
  isLoading: boolean;
  error: string | null;
  likedUserIds: Set<string>;
  likedByUserIds: Set<string>;
  mutualUserIds: Set<string>;
  showMutualMatchModal: boolean;
  mutualMatchUser: MutualMatchUser | null;

  likeUser: (userId: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  unlikeUser: (userId: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  toggleLike: (userId: string) => Promise<{ success: boolean; error?: string }>;
  hasLiked: (userId: string) => boolean;
  isMutualMatch: (userId: string) => boolean;
  fetchLikesSent: (limit?: number, offset?: number) => Promise<{ likes: Like[]; total: number } | null>;
  fetchLikesReceived: (limit?: number, offset?: number) => Promise<{ likes: Like[]; total: number } | null>;
  fetchMutualMatches: (limit?: number, offset?: number) => Promise<{ mutual_matches: MutualMatch[]; total: number } | null>;
  checkLikeStatus: (userId: string) => Promise<{ i_liked: boolean; they_liked: boolean; is_mutual: boolean }>;
  unmatch: (userId: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  fetchStats: () => Promise<LikesStats | null>;
  closeMutualMatchModal: () => void;
  setMutualMatchData: (matchData: { matchedUserId: string; matchedUserName?: string; matchedUserPhoto?: string }) => void;
  clear: () => void;
}

const useLikesStore = create<LikesState>((set, get) => ({
  likesSent: [],
  likesReceived: [],
  mutualMatches: [],
  stats: {
    likes_sent: 0,
    likes_received: 0,
    mutual_matches: 0,
    pending_likes: 0,
  },
  isLoading: false,
  error: null,
  likedUserIds: new Set<string>(),
  likedByUserIds: new Set<string>(),
  mutualUserIds: new Set<string>(),
  showMutualMatchModal: false,
  mutualMatchUser: null,

  likeUser: async (userId) => {
    try {
      const response = await api.post(`/likes/${userId}`);

      set((state) => ({
        likedUserIds: new Set([...state.likedUserIds, userId]),
        stats: {
          ...state.stats,
          likes_sent: state.stats.likes_sent + 1,
        },
      }));

      // Check if it's a mutual match
      if (response.data.is_mutual) {
        set((state) => ({
          mutualUserIds: new Set([...state.mutualUserIds, userId]),
          stats: {
            ...state.stats,
            mutual_matches: state.stats.mutual_matches + 1,
          },
          showMutualMatchModal: true,
          mutualMatchUser: response.data.mutual_match,
        }));
      }

      return { success: true, data: response.data };
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { detail?: string } } };
      const message = axiosError.response?.data?.detail || 'Failed to like user';
      return { success: false, error: message };
    }
  },

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
          likesSent: state.likesSent.filter((l) => l.liked_user_id !== userId),
          mutualMatches: state.mutualMatches.filter((m) => m.matched_user_id !== userId),
          stats: {
            ...state.stats,
            likes_sent: Math.max(0, state.stats.likes_sent - 1),
            mutual_matches: response.data.was_mutual
              ? Math.max(0, state.stats.mutual_matches - 1)
              : state.stats.mutual_matches,
          },
        };
      });

      return { success: true, data: response.data };
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { detail?: string } } };
      const message = axiosError.response?.data?.detail || 'Failed to unlike user';
      return { success: false, error: message };
    }
  },

  toggleLike: async (userId) => {
    if (get().hasLiked(userId)) {
      return await get().unlikeUser(userId);
    } else {
      return await get().likeUser(userId);
    }
  },

  hasLiked: (userId) => {
    return get().likedUserIds.has(userId);
  },

  isMutualMatch: (userId) => {
    return get().mutualUserIds.has(userId);
  },

  fetchLikesSent: async (limit = 50, offset = 0) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/likes/sent', {
        params: { limit, offset },
      });

      const likedIds = new Set<string>(response.data.likes.map((l: Like) => l.liked_user_id));
      const mutualIds = new Set<string>(
        response.data.likes
          .filter((l: Like) => l.status === 'mutual')
          .map((l: Like) => l.liked_user_id)
      );

      set({
        likesSent: response.data.likes,
        likedUserIds: likedIds,
        mutualUserIds: mutualIds,
        isLoading: false,
      });

      return response.data;
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { detail?: string } } };
      const message = axiosError.response?.data?.detail || 'Failed to fetch likes sent';
      set({ isLoading: false, error: message });
      return null;
    }
  },

  fetchLikesReceived: async (limit = 50, offset = 0) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/likes/received', {
        params: { limit, offset },
      });

      const likedByIds = new Set<string>(response.data.likes.map((l: Like) => l.liker_id));

      set({
        likesReceived: response.data.likes,
        likedByUserIds: likedByIds,
        isLoading: false,
      });

      return response.data;
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { detail?: string } } };
      const message = axiosError.response?.data?.detail || 'Failed to fetch likes received';
      set({ isLoading: false, error: message });
      return null;
    }
  },

  fetchMutualMatches: async (limit = 50, offset = 0) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/likes/mutual', {
        params: { limit, offset },
      });

      const mutualIds = new Set<string>(
        response.data.mutual_matches.map((m: MutualMatch) => m.matched_user_id)
      );

      set({
        mutualMatches: response.data.mutual_matches,
        mutualUserIds: mutualIds,
        isLoading: false,
      });

      return response.data;
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { detail?: string } } };
      const message = axiosError.response?.data?.detail || 'Failed to fetch mutual matches';
      set({ isLoading: false, error: message });
      return null;
    }
  },

  checkLikeStatus: async (userId) => {
    try {
      const response = await api.get(`/likes/check/${userId}`);
      return response.data;
    } catch {
      return {
        i_liked: false,
        they_liked: false,
        is_mutual: false,
      };
    }
  },

  unmatch: async (userId) => {
    try {
      const response = await api.post(`/likes/${userId}/unmatch`);

      set((state) => {
        const newMutualIds = new Set(state.mutualUserIds);
        newMutualIds.delete(userId);

        return {
          mutualUserIds: newMutualIds,
          mutualMatches: state.mutualMatches.filter((m) => m.matched_user_id !== userId),
          stats: {
            ...state.stats,
            mutual_matches: Math.max(0, state.stats.mutual_matches - 1),
          },
        };
      });

      return { success: true, data: response.data };
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { detail?: string } } };
      const message = axiosError.response?.data?.detail || 'Failed to unmatch';
      return { success: false, error: message };
    }
  },

  fetchStats: async () => {
    try {
      const response = await api.get('/likes/stats');
      set({ stats: response.data });
      return response.data;
    } catch {
      return null;
    }
  },

  closeMutualMatchModal: () => {
    set({ showMutualMatchModal: false, mutualMatchUser: null });
  },

  setMutualMatchData: (matchData) => {
    set((state) => ({
      showMutualMatchModal: true,
      mutualMatchUser: {
        matched_user_id: matchData.matchedUserId,
        user: {
          id: matchData.matchedUserId,
          firstname: matchData.matchedUserName?.split(' ')[0] || matchData.matchedUserName,
          lastname: matchData.matchedUserName?.split(' ').slice(1).join(' ') || '',
          photo: matchData.matchedUserPhoto,
        },
      },
      mutualUserIds: new Set([...state.mutualUserIds, matchData.matchedUserId]),
    }));
  },

  clear: () => {
    set({
      likesSent: [],
      likesReceived: [],
      mutualMatches: [],
      stats: {
        likes_sent: 0,
        likes_received: 0,
        mutual_matches: 0,
        pending_likes: 0,
      },
      likedUserIds: new Set<string>(),
      likedByUserIds: new Set<string>(),
      mutualUserIds: new Set<string>(),
      error: null,
      showMutualMatchModal: false,
      mutualMatchUser: null,
    });
  },
}));

export default useLikesStore;
