import { useQuery } from '@tanstack/react-query';
import { mapService } from '@/services/map.service';

const EMPTY_LISTING_PINS = {
  mode: 'pins',
  pins: [],
  clusters: [],
  total: 0,
  truncated: false,
};

/**
 * Flats inside the visible map area. Disabled until the map reports its
 * bounds, so we never fire a request for the whole world.
 */
export function useListingMapPins({ bbox, zoom, search, filters, enabled = true }) {
  const query = useQuery({
    queryKey: ['listing-map-pins', bbox, zoom, search, filters],
    queryFn: async () => {
      const { data } = await mapService.getListingPins({ bbox, zoom, search, filters });
      return data;
    },
    enabled: enabled && !!bbox,
    // Panning back to a previous area shouldn't flash empty.
    placeholderData: (previous) => previous,
  });

  return { ...query, data: query.data || EMPTY_LISTING_PINS };
}

/** Full listings for the visible area, shown in the list beside the map. */
export function useListingsInArea({ bbox, search, sort, filters, enabled = true }) {
  const query = useQuery({
    queryKey: ['listings', 'in-view', bbox, search, sort, filters],
    queryFn: async () => {
      const { data } = await mapService.getListingsInArea({ bbox, search, sort, filters });
      return Array.isArray(data) ? data : data?.listings || [];
    },
    enabled: enabled && !!bbox,
    placeholderData: (previous) => previous,
  });

  return { ...query, data: query.data || [] };
}

const EMPTY_FLATMATE_PINS = { pins: [], total: 0, totalWithArea: 0, totalMatches: 0 };

/**
 * Flatmates whose preferred area is in view. Only meaningful for a signed-in
 * tenant with a complete profile; the backend rejects everyone else, so this
 * stays disabled rather than retrying a guaranteed 400.
 */
export function useFlatmateMapPins({ bbox, minScore = 0, enabled = true }) {
  const query = useQuery({
    queryKey: ['flatmate-map-pins', bbox, minScore],
    queryFn: async () => {
      const { data } = await mapService.getFlatmatePins({ bbox, minScore });
      return data;
    },
    enabled: enabled && !!bbox,
    retry: false,
    placeholderData: (previous) => previous,
  });

  return { ...query, data: query.data || EMPTY_FLATMATE_PINS };
}
