import { Dimensions } from 'react-native';
import type { Region } from 'react-native-maps';

/**
 * react-native-maps thinks in a centre plus deltas; the map API thinks in a
 * bounding box plus a tile zoom level (the same scale Leaflet uses on web, so
 * both platforms cluster at the same point).
 */

const TILE_SIZE = 256;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** "swLng,swLat,neLng,neLat", rounded to ~1m so panning doesn't churn the cache. */
export function regionToBbox(region: Region): string {
  const halfLat = region.latitudeDelta / 2;
  const halfLng = region.longitudeDelta / 2;
  const round = (n: number) => Number(n.toFixed(5));

  return [
    round(clamp(region.longitude - halfLng, -180, 180)),
    round(clamp(region.latitude - halfLat, -90, 90)),
    round(clamp(region.longitude + halfLng, -180, 180)),
    round(clamp(region.latitude + halfLat, -90, 90)),
  ].join(',');
}

/**
 * The tile zoom that shows `longitudeDelta` degrees across the screen:
 * the world is TILE_SIZE * 2^zoom pixels wide at zoom.
 */
export function regionToZoom(region: Region, screenWidth?: number): number {
  const width = screenWidth ?? Dimensions.get('window').width;
  if (!region.longitudeDelta) return 12;
  const zoom = Math.log2((360 * width) / (TILE_SIZE * region.longitudeDelta));
  return clamp(Math.round(zoom), 0, 20);
}

/** Poland, wide enough to see the major cities before the user moves. */
export const POLAND_REGION: Region = {
  latitude: 52.0693,
  longitude: 19.4803,
  latitudeDelta: 6,
  longitudeDelta: 6,
};

/** Region centred on a point, tight enough to show individual pins. */
export function regionAround(
  latitude: number,
  longitude: number,
  delta = 0.06,
): Region {
  return { latitude, longitude, latitudeDelta: delta, longitudeDelta: delta };
}
