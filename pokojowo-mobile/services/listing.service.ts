import api from '@/lib/api';
import type { Listing, ListingFilters, CreateListingData } from '@/types/listing.types';

export const listingService = {
  getListings: (filters?: ListingFilters) =>
    api.get<Listing[]>('/listings/', { params: filters }),

  getListing: (id: string) =>
    api.get<Listing>(`/listings/${id}`),

  getMyListings: () =>
    api.get<Listing[]>('/listings/my-listings'),

  getListingsByOwner: (ownerId: string) =>
    api.get<Listing[]>(`/listings/owner/${ownerId}`),

  createListing: (data: CreateListingData) =>
    api.post<Listing>('/listings/', data),

  updateListing: (id: string, data: Partial<CreateListingData>) =>
    api.put<Listing>(`/listings/${id}`, data),

  deleteListing: (id: string) =>
    api.delete(`/listings/${id}`),
};

export default listingService;
