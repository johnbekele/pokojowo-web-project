import api from '@/lib/api';
import { fileFromUri } from '@/lib/upload';
import type { Listing, ListingFilters, ListingPage, CreateListingData } from '@/types/listing.types';

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

export function normalizeListing(listing: Listing): Listing {
  const source = listing as Listing & Record<string, unknown>;
  return {
    ...listing,
    id: listing.id || listing._id || '',
    owner_id: listing.owner_id || listing.ownerId || '',
    max_tenants: listing.max_tenants ?? listing.maxTenants,
    available_from: listing.available_from ?? listing.availableFrom,
    room_type: listing.room_type ?? listing.roomType,
    building_type: listing.building_type ?? listing.buildingType,
    is_active: listing.is_active ?? (source.isActive as boolean | undefined),
    rent_for: listing.rent_for ?? (source.rentFor as string | undefined),
    rent_for_only: listing.rent_for_only ?? (source.rentForOnly as string | undefined),
    deposit: listing.deposit ?? (source.depositAmount as number | undefined),
    utilities_included:
      listing.utilities_included ?? (source.utilitiesIncluded as boolean | undefined),
    min_lease: listing.min_lease ?? (source.minLease as number | undefined),
    can_be_contacted: listing.can_be_contacted ?? listing.canBeContacted,
    close_to: listing.close_to ?? listing.closeTo,
    isScraped: listing.isScraped ?? listing.is_scraped,
    sourceUrl: listing.sourceUrl ?? listing.source_url,
    sourceSite: listing.sourceSite ?? listing.source_site,
    created_at: listing.created_at || listing.createdAt || '',
  };
}

function normalizePage(page: ListingPage): ListingPage {
  return { ...page, listings: page.listings.map(normalizeListing) };
}

export const listingService = {
  getListings: (filters?: ListingFilters) =>
    api
      .get<Listing[] | ListingPage>('/listings/', { params: toQueryParams(filters) })
      .then((response) => ({
        ...response,
        data: Array.isArray(response.data)
          ? response.data.map(normalizeListing)
          : normalizePage(response.data),
      })),

  getListingsPage: (filters: ListingFilters = {}, skip = 0, limit = 20) =>
    api
      .get<ListingPage>('/listings/', {
        params: toQueryParams({ ...filters, skip, limit, with_meta: true }),
      })
      .then((response) => ({ ...response, data: normalizePage(response.data) })),

  getListing: (id: string) =>
    api
      .get<Listing>(`/listings/${id}`)
      .then((response) => ({ ...response, data: normalizeListing(response.data) })),

  getMyListings: () =>
    api.get<Listing[]>('/listings/my-listings').then((response) => ({
      ...response,
      data: response.data.map(normalizeListing),
    })),

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
