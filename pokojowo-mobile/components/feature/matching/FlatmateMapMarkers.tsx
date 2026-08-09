import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Marker } from 'react-native-maps';
import { Image } from 'expo-image';

import { getImageUrl } from '@/lib/image';
import type { FlatmateMapPin } from '@/types/map.types';

interface FlatmateMapMarkersProps {
  pins: FlatmateMapPin[];
  onSelect?: (pin: FlatmateMapPin) => void;
}

const MAX_VISIBLE_MARKERS = 100;

function FlatmateMarker({
  pin,
  onSelect,
}: {
  pin: FlatmateMapPin;
  onSelect?: (pin: FlatmateMapPin) => void;
}) {
  const photo = pin.photo ? getImageUrl(pin.photo) : null;
  const [tracksViewChanges, setTracksViewChanges] = useState(Boolean(photo));

  // A reused marker can receive a new avatar URL after a refetch. Track the
  // image until that new URL has rendered, then freeze the native marker so
  // map frames do not continuously redraw it on Android.
  useEffect(() => {
    setTracksViewChanges(Boolean(photo));
  }, [photo]);

  return (
    <Marker
      key={pin.userId}
      coordinate={{ latitude: pin.lat, longitude: pin.lng }}
      onPress={() => onSelect?.(pin)}
      tracksViewChanges={tracksViewChanges}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View className="items-center">
        <View className="h-11 w-11 rounded-full border-[3px] border-brand bg-card overflow-hidden items-center justify-center">
          {photo ? (
            <Image
              source={{ uri: photo }}
              className="h-full w-full"
              cachePolicy="memory-disk"
              onLoad={() => setTracksViewChanges(false)}
            />
          ) : (
            <Text className="text-text font-bold">
              {pin.firstname?.[0]?.toUpperCase() || '?'}
            </Text>
          )}
        </View>
        <View className="-mt-1.5 rounded-full bg-brand px-1.5">
          <Text className="text-brand-fg text-[10px] font-bold">
            {Math.round(pin.score)}%
          </Text>
        </View>
      </View>
    </Marker>
  );
}

/**
 * Flatmates drawn on the listings map. Each pin marks the area someone *wants*
 * to live in (from their search preferences, scattered a few hundred metres),
 * never where they live now.
 */
export default function FlatmateMapMarkers({
  pins,
  onSelect,
}: FlatmateMapMarkersProps) {
  return (
    <>
      {pins.slice(0, MAX_VISIBLE_MARKERS).map((pin) => (
        <FlatmateMarker key={pin.userId} pin={pin} onSelect={onSelect} />
      ))}
    </>
  );
}
