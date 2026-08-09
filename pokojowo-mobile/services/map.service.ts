import api from '@/lib/api';
import type { ListingFilters } from '@/types/listing.types';
import type {
  FlatmateMapResponse,
  ListingMapResponse,
} from '@/types/map.types';

/** Filters -> query params, matching the shape listing.service.ts sends. */
function toQueryParams(filters?: ListingFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (!filters) return params;

  const { room_types, building_types, rent_for, districts, ...scalars } =
    filters;
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

export const mapService = {
  /**
   * Flats in the visible area. Zoomed out the server returns cluster counts
   * instead of pins, so the response mode decides what to draw.
   */
  getListingPins: ({
    bbox,
    zoom,
    filters,
  }: {
    bbox: string;
    zoom: number;
    filters?: ListingFilters;
  }) => {
    const params = toQueryParams(filters);
    // The map endpoint has no sort; dropping it keeps the cache key stable.
    params.delete('sort');
    params.append('bbox', bbox);
    params.append('zoom', String(zoom));
    return api.get<ListingMapResponse>(`/listings/map?${params.toString()}`);
  },

  /** Flatmates whose preferred area is in view. Tenants with a complete profile only. */
  getFlatmatePins: ({
    bbox,
    minScore = 0,
  }: {
    bbox: string;
    minScore?: number;
  }) => {
    const params = new URLSearchParams({ bbox, limit: '100' });
    if (minScore > 0) params.append('minScore', String(minScore));
    return api.get<FlatmateMapResponse>(`/matching/map?${params.toString()}`);
  },
};

export default mapService;
