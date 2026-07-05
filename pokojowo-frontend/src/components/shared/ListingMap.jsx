import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import {
  OSM_TILE_URL,
  OSM_ATTRIBUTION,
  geoJsonToLatLng,
} from '@/lib/leaflet';

/**
 * Read-only map showing a listing's location.
 * Renders nothing when the listing has no coordinates.
 */
export default function ListingMap({ locationGeo, className = '' }) {
  const position = geoJsonToLatLng(locationGeo);
  if (!position) return null;

  return (
    <div className={className}>
      <MapContainer
        center={position}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', minHeight: '280px' }}
      >
        <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
        <Marker position={position} />
      </MapContainer>
    </div>
  );
}
