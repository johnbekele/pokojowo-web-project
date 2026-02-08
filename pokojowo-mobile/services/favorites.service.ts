import api from '@/lib/api';
import type { User } from '@/types/user.types';
import type { Listing } from '@/types/listing.types';

export interface FavoriteUser {
  _id: string;
  user_id: string;
  user: Partial<User>;
  saved_at: string;
}

export interface FavoriteListing {
  _id: string;
  listing_id: string;
  listing: Partial<Listing>;
  saved_at: string;
}

export const favoritesService = {
  // User favorites (for matching)
  saveUser: (userId: string) =>
    api.post<{ message: string }>(`/favorites/users/${userId}`),

  unsaveUser: (userId: string) =>
    api.delete<{ message: string }>(`/favorites/users/${userId}`),

  getSavedUsers: (params?: { skip?: number; limit?: number }) =>
    api.get<{ saved_users: FavoriteUser[]; total: number }>('/favorites/users', { params }),

  isUserSaved: (userId: string) =>
    api.get<{ is_saved: boolean }>(`/favorites/users/${userId}/check`),

  // Listing favorites
  saveListing: (listingId: string) =>
    api.post<{ message: string }>(`/favorites/listings/${listingId}`),

  unsaveListing: (listingId: string) =>
    api.delete<{ message: string }>(`/favorites/listings/${listingId}`),

  getSavedListings: (params?: { skip?: number; limit?: number }) =>
    api.get<{ saved_listings: FavoriteListing[]; total: number }>('/favorites/listings', {
      params,
    }),

  isListingSaved: (listingId: string) =>
    api.get<{ is_saved: boolean }>(`/favorites/listings/${listingId}/check`),
};

export default favoritesService;
