import api from '@/lib/api';
import { fileFromUri } from '@/lib/upload';
import type { Listing, ListingFilters, CreateListingData } from '@/types/listing.types';

interface UploadImagesResponse {
  message: string;
  files: { url: string; filename?: string }[];
}

/** Map filters to the API's query params (arrays become repeated params). */
function toQueryParams(filters?: ListingFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (!filters) return params;

  const { room_types, building_types, rent_for, districts, ...scalars } = filters;
  Object.entries(scalars).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  room_types?.forEach((v) => params.append('room_type', v));
  building_types?.forEach((v) => params.append('building_type', v));
  rent_for?.forEach((v) => params.append('rent_for', v));
  districts?.forEach((v) => params.append('district', v));
  return params;
}

export const listingService = {
  getListings: (filters?: ListingFilters) =>
    api.get<Listing[]>('/listings/', { params: toQueryParams(filters) }),

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

  /** Upload local images and return the hosted (relative) URLs. */
  uploadImages: (uris: string[]) => {
    const form = new FormData();
    uris.forEach((uri) => form.append('files', fileFromUri(uri) as unknown as Blob));
    return api.post<UploadImagesResponse>('/upload/listing/multiple', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default listingService;
