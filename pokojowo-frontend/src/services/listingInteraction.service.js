import api from '@/lib/api';

const LISTING_INTERACTIONS_BASE_URL = '/listing-interactions';

/**
 * API operations for listing views, likes, and compatibility previews.
 * Keeping these calls here lets React Query own server state without making
 * components or client stores responsible for response mapping.
 */
export const listingInteractionService = {
  trackView: async (listingId, durationSeconds = null) => {
    const response = await api.post(
      `${LISTING_INTERACTIONS_BASE_URL}/${listingId}/view`,
      { durationSeconds },
    );
    return response.data;
  },

  likeListing: async (listingId) => {
    const response = await api.post(
      `${LISTING_INTERACTIONS_BASE_URL}/${listingId}/like`,
    );
    return response.data;
  },

  unlikeListing: async (listingId) => {
    const response = await api.delete(
      `${LISTING_INTERACTIONS_BASE_URL}/${listingId}/like`,
    );
    return response.data;
  },

  getMyInteractions: async (listingId) => {
    const response = await api.get(
      `${LISTING_INTERACTIONS_BASE_URL}/${listingId}/my-interactions`,
    );
    return response.data;
  },

  getMyLikedListings: async () => {
    const response = await api.get(`${LISTING_INTERACTIONS_BASE_URL}/my-liked`);
    return response.data;
  },

  getInterestedUsers: async (
    listingId,
    { minCompatibility = 70, limit = 5 } = {},
  ) => {
    const response = await api.get(
      `${LISTING_INTERACTIONS_BASE_URL}/${listingId}/interested-users`,
      { params: { minCompatibility, limit } },
    );
    return response.data;
  },

  getBatchInterestedUsers: async (
    listingIds,
    { minCompatibility = 70, limitPerListing = 3 } = {},
  ) => {
    const response = await api.post(
      `${LISTING_INTERACTIONS_BASE_URL}/batch-interested-users`,
      { listingIds, minCompatibility, limitPerListing },
    );
    return response.data;
  },

  getListingStats: async (listingId) => {
    const response = await api.get(
      `${LISTING_INTERACTIONS_BASE_URL}/${listingId}/stats`,
    );
    return response.data;
  },
};

export default listingInteractionService;
