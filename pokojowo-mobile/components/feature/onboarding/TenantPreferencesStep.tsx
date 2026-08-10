import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PreferredAreaPicker } from '@/components/feature/profile';
import type { TenantFormData, UpdateTenantField } from './tenant.types';

interface Props {
  form: TenantFormData;
  update: UpdateTenantField;
  onAreaChange: (city: string, districts: string[]) => void;
}

export default function TenantPreferencesStep({ form, update, onAreaChange }: Props) {
  const { t } = useTranslation('profile');
  return (
    <View className="gap-4">
      <View className="flex-row gap-3">
        {(['budgetMin', 'budgetMax'] as const).map((field) => (
          <View className="flex-1" key={field}>
            <Text className="text-text font-medium mb-2">
              {t(`preferences.${field}`)} (PLN)
            </Text>
            <TextInput
              className="border border-border rounded-lg px-4 py-3 text-base text-text bg-card"
              value={form[field]}
              onChangeText={(value) => update(field, value)}
              keyboardType="number-pad"
              placeholder={field === 'budgetMin' ? '1000' : '3000'}
            />
          </View>
        ))}
      </View>

      <PreferredAreaPicker
        city={form.preferredLocation}
        districts={form.preferredDistricts}
        onChange={({ city, districts }) => onAreaChange(city, districts)}
      />

      <View>
        <Text className="text-text font-medium mb-2">{t('preferences.leaseDuration')}</Text>
        <View className="flex-row flex-wrap gap-2">
          {['3', '6', '12', '24'].map((months) => {
            const selected = form.leaseDuration === months;
            return (
              <TouchableOpacity
                key={months}
                onPress={() => update('leaseDuration', months)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                className={`px-4 py-2.5 rounded-lg border ${
                  selected ? 'bg-primary-600 border-primary-600' : 'bg-card border-border'
                }`}
              >
                <Text className={`font-medium ${selected ? 'text-white' : 'text-text'}`}>
                  {months}{months === '24' ? '+' : ''} {t('preferences.months')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}
