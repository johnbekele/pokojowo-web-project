import { useQuery } from '@tanstack/react-query';
import { mapService } from '@/services';
import type { ListingFilters } from '@/types/listing.types';
import type { ListingMapResponse } from '@/types/map.types';

export const LISTING_MAP_KEYS = {
  all: ['listing-map'] as const,
  pins: (bbox: string | null, zoom: number | null, filters?: ListingFilters) =>
    ['listing-map', 'pins', bbox, zoom, filters] as const,
};

const EMPTY: ListingMapResponse = {
  mode: 'pins',
  zoom: 0,
  pins: [],
  clusters: [],
  total: 0,
  truncated: false,
};

/**
 * Flats inside the visible map area. Stays disabled until the map reports a
 * region, so we never ask for the whole world.
 */
export function useListingMapPins({
  bbox,
  zoom,
  filters,
  enabled = true,
}: {
  bbox: string | null;
  zoom: number | null;
  filters?: ListingFilters;
  enabled?: boolean;
}) {
  const query = useQuery({
    queryKey: LISTING_MAP_KEYS.pins(bbox, zoom, filters),
    queryFn: () =>
      mapService
        .getListingPins({ bbox: bbox!, zoom: zoom!, filters })
        .then((res) => res.data),
    enabled: enabled && !!bbox && zoom !== null,
    // Panning back somewhere shouldn't blank the map while refetching.
    placeholderData: (previous) => previous,
  });

  return { ...query, data: query.data ?? EMPTY };
}
