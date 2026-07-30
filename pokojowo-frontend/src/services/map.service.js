import api from '@/lib/api';
import { listingParams } from '@/lib/listingQuery';

/**
 * Map data for the /discover map view. Both endpoints take the visible area as
 * a bbox; the listings one also takes the zoom, because zoomed out the server
 * returns cluster counts instead of individual pins.
 */
export const mapService = {
  /** @returns {{mode: 'pins'|'clusters', pins: [], clusters: [], total: number, truncated: boolean}} */
  getListingPins: ({ bbox, zoom, search, filters }) =>
    api.get(`/listings/map?${listingParams({ search, filters, bbox, zoom }).toString()}`),

  /** Full listings for the visible area, for the list beside the map. */
  getListingsInArea: ({ bbox, search, sort, filters, limit = 30 }) => {
    const params = listingParams({ search, sort, filters, bbox });
    params.append('limit', String(limit));
    return api.get(`/listings/?${params.toString()}`);
  },

  /** Flatmates whose *preferred* area falls in view. Requires auth. */
  getFlatmatePins: ({ bbox, minScore = 0 }) => {
    const params = new URLSearchParams({ bbox });
    if (minScore > 0) params.append('minScore', minScore);
    return api.get(`/matching/map?${params.toString()}`);
  },
};

export default mapService;
