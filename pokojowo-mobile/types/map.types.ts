/** Lean shapes returned by GET /listings/map and GET /matching/map. */

export interface ListingMapPin {
  id: string;
  lat: number;
  lng: number;
  price: number;
  size?: number | null;
  roomType?: string | null;
  district?: string | null;
  city?: string | null;
  address?: string | null;
  image?: string | null;
}

/** A grid cell of listings, returned instead of pins when zoomed out. */
export interface ListingMapCluster {
  id: string;
  lat: number;
  lng: number;
  count: number;
  minPrice?: number | null;
}

export interface ListingMapResponse {
  mode: 'pins' | 'clusters';
  zoom: number;
  pins: ListingMapPin[];
  clusters: ListingMapCluster[];
  total: number;
  /** True when more matched than the response could carry — zoom in for the rest. */
  truncated: boolean;
}

/**
 * A flatmate pinned at the area they *want* to live in, scattered a few
 * hundred metres so co-located pins don't overlap. Never a home address.
 */
export interface FlatmateMapPin {
  userId: string;
  lat: number;
  lng: number;
  score: number;
  tier?: string | null;
  photo?: string | null;
  firstname?: string | null;
  age?: number | null;
  preferredLocation?: string | null;
  preferredDistricts: string[];
  budget?: { min?: number | null; max?: number | null; currency?: string | null } | null;
}

export interface FlatmateMapResponse {
  pins: FlatmateMapPin[];
  total: number;
  /** How many of your matches shared an area at all, in view or not. */
  totalWithArea: number;
  totalMatches: number;
}
