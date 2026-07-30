import { View, Text, Image, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Home, MapPin, X } from 'lucide-react-native';

import useTheme from '@/hooks/useTheme';
import { getImageUrl } from '@/lib/image';
import { formatCurrency } from '@/lib/utils';
import type { ListingMapPin } from '@/types/map.types';

interface MapPinCardProps {
  pin: ListingMapPin;
  onPress: () => void;
  onDismiss: () => void;
}

/** Preview of the tapped pin, anchored to the bottom of the map. */
export default function MapPinCard({ pin, onPress, onDismiss }: MapPinCardProps) {
  const { t } = useTranslation('listings');
  const { colors } = useTheme();
  const place = [pin.district, pin.city].filter(Boolean).join(', ') || pin.address;

  return (
    <View className="absolute left-4 right-4 bottom-4 rounded-2xl bg-card border border-border shadow-lg">
      <TouchableOpacity
        onPress={onDismiss}
        className="absolute -top-2 -right-2 z-10 h-7 w-7 rounded-full bg-surface border border-border items-center justify-center"
        accessibilityLabel={t('map.dismissPin', 'Close')}
      >
        <X size={14} color={colors.text} />
      </TouchableOpacity>

      <TouchableOpacity onPress={onPress} className="flex-row p-3 gap-3" activeOpacity={0.8}>
        <Image
          source={{ uri: getImageUrl(pin.image) }}
          className="h-20 w-24 rounded-xl"
          resizeMode="cover"
        />
        <View className="flex-1 justify-center">
          <Text className="text-text text-lg font-bold">
            {formatCurrency(pin.price)}
            <Text className="text-muted text-xs font-normal">
              {' '}
              / {t('card.month', 'mo')}
            </Text>
          </Text>
          {!!place && (
            <View className="flex-row items-center mt-0.5">
              <MapPin size={12} color={colors.muted} />
              <Text className="text-muted text-xs ml-1 flex-1" numberOfLines={1}>
                {place}
              </Text>
            </View>
          )}
          <View className="flex-row items-center gap-3 mt-1">
            {!!pin.size && (
              <View className="flex-row items-center">
                <Home size={12} color={colors.muted} />
                <Text className="text-muted text-xs ml-1">{pin.size} m²</Text>
              </View>
            )}
            {!!pin.roomType && <Text className="text-muted text-xs">{pin.roomType}</Text>}
          </View>
        </View>
        <View className="justify-center">
          <ChevronRight size={20} color={colors.muted} />
        </View>
      </TouchableOpacity>
    </View>
  );
}
