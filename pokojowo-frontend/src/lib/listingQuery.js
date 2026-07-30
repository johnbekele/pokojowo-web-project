// One place that turns the /discover filter state into API query params, so
// the list view and the map view can never disagree about what's being asked
// for. Mirrors build_listing_query in the backend's listings endpoint.

export const MAX_PRICE = 10000;
export const MAX_SIZE = 200;

export function listingParams({ search, sort, filters = {}, bbox, zoom } = {}) {
  const params = new URLSearchParams();

  if (search) params.append('search', search);
  if (sort) params.append('sort', sort);

  // Defaults are the full range; sending them would only slow the query down.
  if (filters.minPrice > 0) params.append('min_price', filters.minPrice);
  if (filters.maxPrice < MAX_PRICE) params.append('max_price', filters.maxPrice);
  if (filters.minSize > 0) params.append('min_size', filters.minSize);
  if (filters.maxSize < MAX_SIZE) params.append('max_size', filters.maxSize);

  filters.roomTypes?.forEach((v) => params.append('room_type', v));
  filters.buildingTypes?.forEach((v) => params.append('building_type', v));
  filters.rentFor?.forEach((v) => params.append('rent_for', v));
  filters.districts?.forEach((v) => params.append('district', v));

  if (filters.maxTenants) params.append('max_tenants', filters.maxTenants);
  if (filters.city) params.append('city', filters.city);
  if (filters.offeredBy) params.append('offered_by', filters.offeredBy);

  if (bbox) params.append('bbox', bbox);
  if (zoom !== undefined && zoom !== null) params.append('zoom', Math.round(zoom));

  return params;
}

/** Leaflet bounds -> the `swLng,swLat,neLng,neLat` string the API expects. */
export function boundsToBbox(bounds) {
  if (!bounds) return null;
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  // 5 decimals is ~1m — more precision only churns the React Query cache key.
  const round = (n) => Number(n.toFixed(5));
  return [round(sw.lng), round(sw.lat), round(ne.lng), round(ne.lat)].join(',');
}
