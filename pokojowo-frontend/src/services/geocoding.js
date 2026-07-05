// Nominatim (OpenStreetMap) forward geocoding.
// Usage policy: max 1 request/second, no per-keystroke autocomplete —
// we only geocode on an explicit "Find on map" click.
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export async function geocodeAddress({ address, city, district }) {
  const q = [address, district, city].filter(Boolean).join(', ');
  if (!q) return null;

  const params = new URLSearchParams({
    q,
    format: 'json',
    countrycodes: 'pl',
    limit: '1',
  });

  const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Geocoding failed (${response.status})`);
  }

  const results = await response.json();
  if (!results.length) return null;
  return {
    latitude: parseFloat(results[0].lat),
    longitude: parseFloat(results[0].lon),
  };
}
