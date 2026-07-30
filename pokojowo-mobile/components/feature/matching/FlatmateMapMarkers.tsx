import { View, Text, Image } from 'react-native';
import { Marker } from 'react-native-maps';

import { getImageUrl } from '@/lib/image';
import type { FlatmateMapPin } from '@/types/map.types';

interface FlatmateMapMarkersProps {
  pins: FlatmateMapPin[];
  onSelect?: (pin: FlatmateMapPin) => void;
}

/**
 * Flatmates drawn on the listings map. Each pin marks the area someone *wants*
 * to live in (from their search preferences, scattered a few hundred metres),
 * never where they live now.
 */
export default function FlatmateMapMarkers({ pins, onSelect }: FlatmateMapMarkersProps) {
  return (
    <>
      {pins.map((pin) => {
        const photo = pin.photo ? getImageUrl(pin.photo) : null;
        return (
          <Marker
            key={pin.userId}
            coordinate={{ latitude: pin.lat, longitude: pin.lng }}
            onPress={() => onSelect?.(pin)}
            // Avatars load asynchronously, so the marker has to redraw once the
            // image arrives; without this it stays blank on Android.
            tracksViewChanges={!!photo}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View className="items-center">
              <View className="h-11 w-11 rounded-full border-[3px] border-brand bg-card overflow-hidden items-center justify-center">
                {photo ? (
                  <Image source={{ uri: photo }} className="h-full w-full" />
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
      })}
    </>
  );
}
