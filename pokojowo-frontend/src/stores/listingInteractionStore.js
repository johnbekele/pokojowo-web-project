import { create } from 'zustand';
import api from '@/lib/api';

/**
 * Listing Interaction Store
 * Manages listing interactions (views, likes, inquiries) and
 * compatible roommate data for listings.
 */
const useListingInteractionStore = create((set, get) => ({
  // State
  interestedUsersCache: {}, // { listingId: [users] }
  likedListingIds: new Set(),
  myInteractions: {}, // { listingId: { hasViewed, hasLiked, hasInquired } }
  isLoading: false,
  error: null,

  // Track a view interaction
  trackView: async (listingId, durationSeconds = null) => {
    try {
      await api.post(`/listing-interactions/${listingId}/view`, {
        durationSeconds
      });
      return { success: true };
    } catch (error) {
      console.error('Failed to track view:', error);
      return { success: false };
    }
  },

  // Like a listing (optimistic update)
  likeListing: async (listingId) => {
    // Optimistic: Update UI immediately
    set((state) => ({
      likedListingIds: new Set([...state.likedListingIds, listingId]),
      myInteractions: {
        ...state.myInteractions,
        [listingId]: {
          ...state.myInteractions[listingId],
          hasLiked: true
        }
      }
    }));

    try {
      const response = await api.post(`/listing-interactions/${listingId}/like`);
      return { success: true, data: response.data };
    } catch (error) {
      // Rollback on failure
      set((state) => {
        const newLikedIds = new Set(state.likedListingIds);
        newLikedIds.delete(listingId);
        return {
          likedListingIds: newLikedIds,
          myInteractions: {
            ...state.myInteractions,
            [listingId]: {
              ...state.myInteractions[listingId],
              hasLiked: false
            }
          }
        };
      });
      const message = error.response?.data?.detail || 'Failed to like listing';
      return { success: false, error: message };
    }
  },

  // Unlike a listing (optimistic update)
  unlikeListing: async (listingId) => {
    // Optimistic: Update UI immediately
    set((state) => {
      const newLikedIds = new Set(state.likedListingIds);
      newLikedIds.delete(listingId);
      return {
        likedListingIds: newLikedIds,
        myInteractions: {
          ...state.myInteractions,
          [listingId]: {
            ...state.myInteractions[listingId],
            hasLiked: false
          }
        }
      };
    });

    try {
      await api.delete(`/listing-interactions/${listingId}/like`);
      return { success: true };
    } catch (error) {
      // Rollback on failure
      set((state) => ({
        likedListingIds: new Set([...state.likedListingIds, listingId]),
        myInteractions: {
          ...state.myInteractions,
          [listingId]: {
            ...state.myInteractions[listingId],
            hasLiked: true
          }
        }
      }));
      const message = error.response?.data?.detail || 'Failed to unlike listing';
      return { success: false, error: message };
    }
  },

  // Toggle like status (optimistic - no await needed for UI)
  toggleLike: (listingId) => {
    if (get().isLiked(listingId)) {
      return get().unlikeListing(listingId);
    } else {
      return get().likeListing(listingId);
    }
  },

  // Check if listing is liked
  isLiked: (listingId) => {
    return get().likedListingIds.has(listingId);
  },

  // Fetch interested users for a single listing
  fetchInterestedUsers: async (listingId, minCompatibility = 70, limit = 5) => {
    try {
      const response = await api.get(`/listing-interactions/${listingId}/interested-users`, {
        params: { minCompatibility, limit }
      });

      const users = response.data.interestedUsers || [];

      set((state) => ({
        interestedUsersCache: {
          ...state.interestedUsersCache,
          [listingId]: users
        }
      }));

      return users;
    } catch (error) {
      console.error('Failed to fetch interested users:', error);
      return [];
    }
  },

  // Batch fetch interested users for multiple listings
  fetchBatchInterestedUsers: async (listingIds, minCompatibility = 70, limitPerListing = 3) => {
    if (!listingIds || listingIds.length === 0) return {};

    set({ isLoading: true });

    try {
      const response = await api.post('/listing-interactions/batch-interested-users', {
        listingIds,
        minCompatibility,
        limitPerListing
      });

      const results = response.data.results || {};

      set((state) => ({
        interestedUsersCache: {
          ...state.interestedUsersCache,
          ...results
        },
        isLoading: false
      }));

      return results;
    } catch (error) {
      console.error('Failed to batch fetch interested users:', error);
      set({ isLoading: false });
      return {};
    }
  },

  // Get interested users from cache
  getInterestedUsers: (listingId) => {
    return get().interestedUsersCache[listingId] || [];
  },

  // Fetch user's interactions with a listing
  fetchMyInteractions: async (listingId) => {
    try {
      const response = await api.get(`/listing-interactions/${listingId}/my-interactions`);
      const interactions = response.data;

      set((state) => ({
        myInteractions: {
          ...state.myInteractions,
          [listingId]: interactions
        },
        likedListingIds: interactions.hasLiked
          ? new Set([...state.likedListingIds, listingId])
          : state.likedListingIds
      }));

      return interactions;
    } catch (error) {
      console.error('Failed to fetch my interactions:', error);
      return { hasViewed: false, hasLiked: false, hasInquired: false };
    }
  },

  // Fetch all liked listings for current user
  fetchMyLikedListings: async () => {
    try {
      const response = await api.get('/listing-interactions/my-liked');
      const likedIds = new Set(response.data.likedListingIds || []);

      set({ likedListingIds: likedIds });

      return response.data;
    } catch (error) {
      console.error('Failed to fetch liked listings:', error);
      return { likedListingIds: [], count: 0 };
    }
  },

  // Get my interactions from cache
  getMyInteractions: (listingId) => {
    return get().myInteractions[listingId] || { hasViewed: false, hasLiked: false, hasInquired: false };
  },

  // Clear cache for a specific listing
  clearListingCache: (listingId) => {
    set((state) => {
      const newCache = { ...state.interestedUsersCache };
      delete newCache[listingId];
      const newInteractions = { ...state.myInteractions };
      delete newInteractions[listingId];
      return {
        interestedUsersCache: newCache,
        myInteractions: newInteractions
      };
    });
  },

  // Clear all store data
  clear: () => {
    set({
      interestedUsersCache: {},
      likedListingIds: new Set(),
      myInteractions: {},
      error: null
    });
  }
}));

export default useListingInteractionStore;
