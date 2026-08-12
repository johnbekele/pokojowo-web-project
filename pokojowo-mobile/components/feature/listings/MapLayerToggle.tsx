import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

export type MapLayer = 'flats' | 'flatmates' | 'both';

interface MapLayerToggleProps {
  value: MapLayer;
  onChange: (value: MapLayer) => void;
}

/** Flats / Flatmates / Both. Defaults to flats — that's what Discover is for. */
export default function MapLayerToggle({ value, onChange }: MapLayerToggleProps) {
  const { t } = useTranslation('listings');

  const options: { id: MapLayer; label: string }[] = [
    { id: 'flats', label: t('map.layers.flats', 'Flats') },
    { id: 'flatmates', label: t('map.layers.flatmates', 'Flatmates') },
    { id: 'both', label: t('map.layers.both', 'Both') },
  ];

  return (
    <View className="flex-row items-center bg-surface rounded-full p-1 self-start">
      {options.map((option) => {
        const selected = value === option.id;
        return (
          <TouchableOpacity
            key={option.id}
            onPress={() => onChange(option.id)}
            className={cn('px-4 py-2 rounded-full', selected && 'bg-brand')}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
          >
            <Text
              className={cn(
                'text-sm font-medium',
                selected ? 'text-brand-fg' : 'text-muted',
              )}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
