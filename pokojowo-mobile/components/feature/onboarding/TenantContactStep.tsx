import { Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { TenantFormData, UpdateTenantField } from './tenant.types';

interface Props {
  form: TenantFormData;
  update: UpdateTenantField;
}

export default function TenantContactStep({ form, update }: Props) {
  const { t } = useTranslation('profile');
  return (
    <View className="gap-4">
      <View>
        <Text className="text-text font-medium mb-2">{t('contact.phone')}</Text>
        <TextInput
          className="border border-border rounded-lg px-4 py-3 text-base text-text bg-card"
          value={form.phone}
          onChangeText={(value) => update('phone', value)}
          keyboardType="phone-pad"
          placeholder={t('contact.phonePlaceholder')}
        />
      </View>
      <View>
        <Text className="text-text font-medium mb-2">{t('contact.location')}</Text>
        <TextInput
          className="border border-border rounded-lg px-4 py-3 text-base text-text bg-card"
          value={form.location}
          onChangeText={(value) => update('location', value)}
          placeholder={t('contact.locationPlaceholder')}
        />
      </View>
    </View>
  );
}
