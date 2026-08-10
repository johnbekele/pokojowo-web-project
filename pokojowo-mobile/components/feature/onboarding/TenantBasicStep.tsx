import { Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ChoiceChips, CHOICES } from './TenantStepFields';
import type { TenantFormData, UpdateTenantField } from './tenant.types';

interface Props {
  form: TenantFormData;
  update: UpdateTenantField;
  dobError: string;
  onDobChange: (value: string) => void;
}

export default function TenantBasicStep({ form, update, dobError, onDobChange }: Props) {
  const { t } = useTranslation('profile');
  return (
    <View className="gap-4">
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text className="text-text font-medium mb-2">{t('basicInfo.firstName')}</Text>
          <TextInput
            className="border border-border rounded-lg px-4 py-3 text-base text-text bg-card"
            value={form.firstname}
            onChangeText={(value) => update('firstname', value)}
            placeholder={t('basicInfo.firstNamePlaceholder')}
          />
        </View>
        <View className="flex-1">
          <Text className="text-text font-medium mb-2">{t('basicInfo.lastName')}</Text>
          <TextInput
            className="border border-border rounded-lg px-4 py-3 text-base text-text bg-card"
            value={form.lastname}
            onChangeText={(value) => update('lastname', value)}
            placeholder={t('basicInfo.lastNamePlaceholder')}
          />
        </View>
      </View>

      <View>
        <Text className="text-text font-medium mb-2">{t('basicInfo.dateOfBirth')}</Text>
        <TextInput
          className="border border-border rounded-lg px-4 py-3 text-base text-text bg-card"
          value={form.dateOfBirth}
          onChangeText={onDobChange}
          keyboardType="numbers-and-punctuation"
          placeholder="YYYY-MM-DD"
          maxLength={10}
        />
        <Text className={dobError ? 'text-red-500 text-xs mt-1' : 'text-muted text-xs mt-1'}>
          {dobError || t('basicInfo.dateOfBirthHint')}
        </Text>
      </View>

      <View>
        <Text className="text-text font-medium mb-2">{t('basicInfo.gender')}</Text>
        <ChoiceChips options={CHOICES.gender} value={form.gender} onChange={(value) => update('gender', value)} />
      </View>

      <View>
        <Text className="text-text font-medium mb-2">{t('basicInfo.bio')}</Text>
        <TextInput
          className="border border-border rounded-lg px-4 py-3 text-base text-text bg-card"
          value={form.bio}
          onChangeText={(value) => update('bio', value)}
          placeholder={t('basicInfo.bioPlaceholder')}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={{ minHeight: 100 }}
        />
      </View>
    </View>
  );
}
