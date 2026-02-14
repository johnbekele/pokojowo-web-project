import api from '@/lib/api';

export interface ListingInteraction {
  has_viewed: boolean;
  has_liked: boolean;
  has_inquired: boolean;
}

export interface InterestedUser {
  user_id: string;
  firstname?: string;
  photo_url?: string;
  compatibility_score: number;
  is_online?: boolean;
}

export interface InterestedUsersResponse {
  listing_id: string;
  interested_users: InterestedUser[];
  total_count: number;
}

export interface ListingStats {
  total_views: number;
  unique_viewers: number;
  total_likes: number;
  total_inquiries: number;
}

export const listingInteractionService = {
  // Track a view on a listing
  trackView: (listingId: string, durationSeconds?: number) =>
    api.post<{ success: boolean; message: string }>(
      `/listing-interactions/${listingId}/view`,
      { duration_seconds: durationSeconds }
    ),

  // Like a listing
  likeListing: (listingId: string) =>
    api.post<{ success: boolean; message: string }>(
      `/listing-interactions/${listingId}/like`
    ),

  // Unlike a listing
  unlikeListing: (listingId: string) =>
    api.delete<{ success: boolean; message: string }>(
      `/listing-interactions/${listingId}/like`
    ),

  // Get user's interactions with a specific listing
  getMyInteractions: (listingId: string) =>
    api.get<ListingInteraction>(
      `/listing-interactions/${listingId}/my-interactions`
    ),

  // Get all listings the user has liked
  getMyLikedListings: () =>
    api.get<{ likedListingIds: string[]; count: number }>(
      '/listing-interactions/my-liked'
    ),

  // Get interested users for a listing (for landlords)
  getInterestedUsers: (
    listingId: string,
    params?: { minCompatibility?: number; limit?: number }
  ) =>
    api.get<InterestedUsersResponse>(
      `/listing-interactions/${listingId}/interested-users`,
      { params }
    ),

  // Get listing statistics (for landlords)
  getListingStats: (listingId: string) =>
    api.get<ListingStats>(`/listing-interactions/${listingId}/stats`),
};

export default listingInteractionService;
