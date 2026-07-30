import { useRef } from 'react';
import { View, Text } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { POLAND_REGION, regionToBbox, regionToZoom } from '@/lib/mapRegion';
import type { ListingMapCluster, ListingMapPin, ListingMapResponse } from '@/types/map.types';
import type { FlatmateMapPin } from '@/types/map.types';
import FlatmateMapMarkers from '@/components/feature/matching/FlatmateMapMarkers';

const REGION_DEBOUNCE_MS = 350;
const CLUSTER_ZOOM_STEP = 3;

/** "2 500" -> "2.5k" so the bubble stays narrow enough to read on a phone. */
function shortPrice(price: number): string {
  if (!Number.isFinite(price)) return '—';
  if (price < 1000) return String(Math.round(price));
  const thousands = price / 1000;
  return `${thousands >= 10 ? Math.round(thousands) : thousands.toFixed(1).replace(/\.0$/, '')}k`;
}

interface ListingMapViewProps {
  data: ListingMapResponse;
  flatmatePins?: FlatmateMapPin[];
  showListings?: boolean;
  selectedPinId?: string | null;
  onRegionChange: (value: { bbox: string; zoom: number }) => void;
  onSelectPin: (pin: ListingMapPin) => void;
  onSelectFlatmate?: (pin: FlatmateMapPin) => void;
  initialRegion?: Region;
  /** Set to re-centre the map, e.g. after "near me". */
  focusRegion?: Region | null;
}

/**
 * The map behind the Discover map tab. Pins come from the server already
 * clustered when zoomed out, so this draws either price bubbles or counts —
 * no client-side clustering library involved.
 */
export default function ListingMapView({
  data,
  flatmatePins = [],
  showListings = true,
  selectedPinId,
  onRegionChange,
  onSelectPin,
  onSelectFlatmate,
  initialRegion = POLAND_REGION,
  focusRegion,
}: ListingMapViewProps) {
  const mapRef = useRef<MapView | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const region = useRef<Region>(initialRegion);

  // Recentre when the caller picks a place ("near me", a searched address).
  const lastFocus = useRef<Region | null>(null);
  if (focusRegion && focusRegion !== lastFocus.current) {
    lastFocus.current = focusRegion;
    mapRef.current?.animateToRegion(focusRegion, 600);
  }

  const handleRegionChangeComplete = (next: Region) => {
    region.current = next;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      onRegionChange({ bbox: regionToBbox(next), zoom: regionToZoom(next) });
    }, REGION_DEBOUNCE_MS);
  };

  /** Tapping a cluster breaks it apart by zooming into it. */
  const zoomIntoCluster = (cluster: ListingMapCluster) => {
    const shrink = 2 ** CLUSTER_ZOOM_STEP;
    mapRef.current?.animateToRegion(
      {
        latitude: cluster.lat,
        longitude: cluster.lng,
        latitudeDelta: Math.max(region.current.latitudeDelta / shrink, 0.005),
        longitudeDelta: Math.max(region.current.longitudeDelta / shrink, 0.005),
      },
      500,
    );
  };

  const isClustered = data.mode === 'clusters';

  return (
    <MapView
      ref={mapRef}
      style={{ flex: 1 }}
      initialRegion={initialRegion}
      onRegionChangeComplete={handleRegionChangeComplete}
      showsUserLocation
      showsMyLocationButton={false}
      toolbarEnabled={false}
    >
      {showListings &&
        isClustered &&
        data.clusters.map((cluster) => (
          <Marker
            key={cluster.id}
            coordinate={{ latitude: cluster.lat, longitude: cluster.lng }}
            onPress={() => zoomIntoCluster(cluster)}
            tracksViewChanges={false}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View className="items-center justify-center rounded-full bg-text px-3 py-2 border-2 border-bg">
              <Text className="text-bg text-xs font-bold">{cluster.count}</Text>
            </View>
          </Marker>
        ))}

      {showListings &&
        !isClustered &&
        data.pins.map((pin) => {
          const selected = selectedPinId === pin.id;
          return (
            <Marker
              key={pin.id}
              coordinate={{ latitude: pin.lat, longitude: pin.lng }}
              onPress={() => onSelectPin(pin)}
              // Re-render only while selected; otherwise Android redraws every
              // marker on each frame and the map stutters.
              tracksViewChanges={selected}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View
                className={`rounded-full px-2.5 py-1 border-2 ${
                  selected ? 'bg-text border-text' : 'bg-card border-border'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${selected ? 'text-bg' : 'text-text'}`}
                >
                  {shortPrice(pin.price)}
                </Text>
              </View>
            </Marker>
          );
        })}

      <FlatmateMapMarkers pins={flatmatePins} onSelect={onSelectFlatmate} />
    </MapView>
  );
}
