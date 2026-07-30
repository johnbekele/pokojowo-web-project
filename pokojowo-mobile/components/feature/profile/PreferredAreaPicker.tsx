import { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FilterChip } from '@/components/ui';
import { CITIES, districtsForCity } from '@/lib/districts';

interface PreferredAreaPickerProps {
  city: string;
  districts: string[];
  onChange: (value: { city: string; districts: string[] }) => void;
}

/**
 * Where a tenant wants to live. Picking a city and district (rather than
 * typing free text) is what lets us place them on the flatmate map — a
 * whole-city guess would stack every Warsaw tenant on one pin.
 *
 * Anything typed before this picker existed still loads: an unrecognised
 * city drops into the free-text field instead of being discarded.
 */
export default function PreferredAreaPicker({
  city,
  districts,
  onChange,
}: PreferredAreaPickerProps) {
  const { t } = useTranslation('profile');
  const isKnownCity = CITIES.includes(city);
  const [useOther, setUseOther] = useState(!!city && !isKnownCity);

  const selectCity = (next: string) => {
    setUseOther(false);
    // Districts belong to a city; keeping them across a change would claim
    // the tenant wants a Warsaw district in Kraków.
    onChange({ city: next === city ? '' : next, districts: [] });
  };

  const toggleDistrict = (district: string) => {
    const next = districts.includes(district)
      ? districts.filter((d) => d !== district)
      : [...districts, district];
    onChange({ city, districts: next });
  };

  const availableDistricts = districtsForCity(city);

  return (
    <View className="gap-3">
      <View>
        <Text className="text-text font-medium mb-2">
          {t('preferences.location', 'Where do you want to live?')}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {CITIES.map((option) => (
            <FilterChip
              key={option}
              label={option}
              selected={!useOther && city === option}
              onPress={() => selectCity(option)}
            />
          ))}
          <FilterChip
            label={t('preferences.otherCity', 'Somewhere else')}
            selected={useOther}
            onPress={() => {
              setUseOther(true);
              onChange({ city: isKnownCity ? '' : city, districts: [] });
            }}
          />
        </View>
      </View>

      {useOther && (
        <TextInput
          className="border border-border rounded-lg px-4 py-3 text-base text-text bg-card"
          value={city}
          onChangeText={(text) => onChange({ city: text, districts: [] })}
          placeholder={t('preferences.otherCityPlaceholder', 'e.g., Katowice')}
          autoCapitalize="words"
        />
      )}

      {availableDistricts.length > 0 && (
        <View>
          <Text className="text-text font-medium mb-1">
            {t('preferences.districts', 'Preferred areas')}
          </Text>
          <Text className="text-muted text-sm mb-2">
            {t(
              'preferences.districtsHint',
              'Optional. Picking areas puts you on the map for flatmates searching there.'
            )}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {availableDistricts.map((district) => (
              <FilterChip
                key={district}
                label={district}
                selected={districts.includes(district)}
                onPress={() => toggleDistrict(district)}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
