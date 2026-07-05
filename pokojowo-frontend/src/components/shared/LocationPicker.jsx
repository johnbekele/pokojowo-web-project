import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OSM_TILE_URL, OSM_ATTRIBUTION } from '@/lib/leaflet';
import { geocodeAddress } from '@/services/geocoding';

const WARSAW_CENTER = [52.2297, 21.0122];

function DraggablePin({ position, onMove }) {
  useMapEvents({ click: (e) => onMove([e.latlng.lat, e.latlng.lng]) });
  if (!position) return null;
  return (
    <Marker
      position={position}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const { lat, lng } = e.target.getLatLng();
          onMove([lat, lng]);
        },
      }}
    />
  );
}

/**
 * Pin-drop location picker for listing creation. Geocodes the entered
 * address once per "Find on map" click (Nominatim policy: no
 * per-keystroke lookups); the draggable marker is the source of truth.
 * Calls onChange({ latitude, longitude }) — or onChange(null) when unset.
 */
export default function LocationPicker({ address, city, district, value, onChange }) {
  const { t } = useTranslation('listings');
  const [isLocating, setIsLocating] = useState(false);
  const [geocodeFailed, setGeocodeFailed] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  const position = value ? [value.latitude, value.longitude] : null;

  const setPosition = ([lat, lng]) => {
    setGeocodeFailed(false);
    onChange({ latitude: lat, longitude: lng });
  };

  const handleLocate = async () => {
    setIsLocating(true);
    setGeocodeFailed(false);
    try {
      const result = await geocodeAddress({ address, city, district });
      if (result) {
        onChange(result);
        setMapKey((k) => k + 1); // re-center the map on the new position
      } else {
        setGeocodeFailed(true);
      }
    } catch {
      setGeocodeFailed(true);
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleLocate}
          disabled={isLocating || (!address && !city)}
        >
          {isLocating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="mr-2 h-4 w-4" />
          )}
          {t('create.location.findOnMap', 'Find on map')}
        </Button>
        {geocodeFailed && (
          <span className="text-xs text-muted-foreground">
            {t('create.location.notFound', 'Address not found — click the map to place the pin.')}
          </span>
        )}
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        <MapContainer
          key={mapKey}
          center={position || WARSAW_CENTER}
          zoom={position ? 15 : 11}
          style={{ height: '280px', width: '100%' }}
        >
          <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
          <DraggablePin position={position} onMove={setPosition} />
        </MapContainer>
      </div>
      <p className="text-xs text-muted-foreground">
        {t('create.location.dragHint', 'Click the map or drag the pin to the exact spot.')}
      </p>
    </div>
  );
}
