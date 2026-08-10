import type { ListingFilters } from './listing.types';

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  search?: string;
  city?: string;
  districts: string[];
  minPrice?: number;
  maxPrice?: number;
  minSize?: number;
  maxSize?: number;
  roomTypes: string[];
  buildingTypes: string[];
  rentFor: string[];
  maxTenants?: number;
  offeredBy?: 'owner' | 'agency';
  notifyEnabled: boolean;
  createdAt: string;
  lastNotifiedAt?: string;
}

export type CreateSavedSearch = Pick<SavedSearch, 'name'> & Partial<Omit<SavedSearch, 'id' | 'userId' | 'name' | 'createdAt'>>;

/** Convert the mobile filter shape to the API's camelCase payload. */
export function savedSearchPayload(name: string, filters: ListingFilters): CreateSavedSearch {
  const payload: CreateSavedSearch = { name: name.trim() };

  if (filters.search?.trim()) payload.search = filters.search.trim();
  if (filters.city) payload.city = filters.city;
  if (filters.districts?.length) payload.districts = filters.districts;
  if (filters.min_price !== undefined) payload.minPrice = filters.min_price;
  if (filters.max_price !== undefined) payload.maxPrice = filters.max_price;
  if (filters.min_size !== undefined) payload.minSize = filters.min_size;
  if (filters.max_size !== undefined) payload.maxSize = filters.max_size;
  if (filters.room_types?.length) payload.roomTypes = filters.room_types;
  if (filters.building_types?.length) payload.buildingTypes = filters.building_types;
  if (filters.rent_for?.length) payload.rentFor = filters.rent_for;
  if (filters.max_tenants !== undefined) payload.maxTenants = filters.max_tenants;
  if (filters.offered_by) payload.offeredBy = filters.offered_by;

  return payload;
}

/** Convert a saved-search response back into the mobile filter shape. */
export function savedSearchFilters(search: SavedSearch): ListingFilters {
  const filters: ListingFilters = {};
  if (search.search) filters.search = search.search;
  if (search.city) filters.city = search.city;
  if (search.districts?.length) filters.districts = search.districts;
  if (search.minPrice !== undefined) filters.min_price = search.minPrice;
  if (search.maxPrice !== undefined) filters.max_price = search.maxPrice;
  if (search.minSize !== undefined) filters.min_size = search.minSize;
  if (search.maxSize !== undefined) filters.max_size = search.maxSize;
  if (search.roomTypes?.length) filters.room_types = search.roomTypes;
  if (search.buildingTypes?.length) filters.building_types = search.buildingTypes;
  if (search.rentFor?.length) filters.rent_for = search.rentFor;
  if (search.maxTenants !== undefined) filters.max_tenants = search.maxTenants;
  if (search.offeredBy) filters.offered_by = search.offeredBy;
  return filters;
}

export function savedSearchSummary(search: SavedSearch): string {
  const parts = [
    search.city,
    search.districts?.length ? search.districts.join(', ') : undefined,
    search.minPrice !== undefined || search.maxPrice !== undefined
      ? `${search.minPrice ?? '—'}–${search.maxPrice ?? '—'} PLN`
      : undefined,
    search.roomTypes?.length ? search.roomTypes.join(', ') : undefined,
  ].filter(Boolean);

  return parts.join(' · ');
}
