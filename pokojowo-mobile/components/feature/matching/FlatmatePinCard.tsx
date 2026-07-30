import { View, Text, Image, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronRight, MapPin, X } from 'lucide-react-native';

import useTheme from '@/hooks/useTheme';
import { getAvatarUrl } from '@/lib/image';
import { formatCurrency } from '@/lib/utils';
import type { FlatmateMapPin } from '@/types/map.types';

interface FlatmatePinCardProps {
  pin: FlatmateMapPin;
  onPress: () => void;
  onDismiss: () => void;
}

/**
 * Preview of a tapped flatmate pin. Says "looking in" rather than "lives in",
 * because the pin is their preferred search area.
 */
export default function FlatmatePinCard({ pin, onPress, onDismiss }: FlatmatePinCardProps) {
  const { t } = useTranslation('matching');
  const { colors } = useTheme();

  const area =
    pin.preferredDistricts?.length > 0
      ? pin.preferredDistricts.join(', ')
      : pin.preferredLocation;

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
          source={{ uri: getAvatarUrl(pin.photo, pin.userId) }}
          className="h-16 w-16 rounded-full"
        />
        <View className="flex-1 justify-center">
          <Text className="text-text text-base font-bold">
            {pin.firstname || t('map.someone', 'A flatmate')}
            {pin.age ? <Text className="text-muted font-normal">, {pin.age}</Text> : null}
          </Text>
          <Text className="text-brand text-xs font-semibold mt-0.5">
            {t('map.compatibility', '{{score}}% match', { score: Math.round(pin.score) })}
          </Text>
          {!!area && (
            <View className="flex-row items-center mt-0.5">
              <MapPin size={12} color={colors.muted} />
              <Text className="text-muted text-xs ml-1 flex-1" numberOfLines={1}>
                {t('map.wantsToLiveIn', 'Looking in {{area}}', { area })}
              </Text>
            </View>
          )}
          {!!pin.budget?.max && (
            <Text className="text-muted text-xs mt-0.5">
              {t('map.budget', 'Budget up to {{amount}}', {
                amount: formatCurrency(pin.budget.max),
              })}
            </Text>
          )}
        </View>
        <View className="justify-center">
          <ChevronRight size={20} color={colors.muted} />
        </View>
      </TouchableOpacity>
    </View>
  );
}
