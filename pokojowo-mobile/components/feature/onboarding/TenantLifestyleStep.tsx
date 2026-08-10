import { Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { CHOICES, ChoiceChips, ToggleOption } from './TenantStepFields';
import type { ChoiceOption, TenantFormData, UpdateTenantField } from './tenant.types';

interface Props {
  form: TenantFormData;
  update: UpdateTenantField;
}

export default function TenantLifestyleStep({ form, update }: Props) {
  const { t } = useTranslation('profile');
  return (
    <View className="gap-5">
      <ChoiceSection label={t('lifestyle.cleanliness.label')} value={form.cleanliness} options={CHOICES.cleanliness} onChange={(value) => update('cleanliness', value)} />
      <ChoiceSection label={t('lifestyle.socialLevel.label')} value={form.socialLevel} options={CHOICES.social} onChange={(value) => update('socialLevel', value)} />
      <ChoiceSection label={t('lifestyle.guests.label')} value={form.guestsFrequency} options={CHOICES.guests} onChange={(value) => update('guestsFrequency', value)} />

      <View className="mt-2">
        <Text className="text-text font-semibold mb-1">{t('coOccupants.title')}</Text>
        <Text className="text-muted text-sm mb-3">{t('coOccupants.subtitle')}</Text>
        <View className="gap-2">
          <ToggleOption label={t('coOccupants.partner')} checked={form.hasPartner} onToggle={() => update('hasPartner', !form.hasPartner)} />
          <ToggleOption label={t('coOccupants.children')} checked={form.hasChildren} onToggle={() => update('hasChildren', !form.hasChildren)} />
        </View>
        {form.hasChildren && (
          <View className="mt-3">
            <Text className="text-text font-medium mb-2">{t('coOccupants.childrenCount')}</Text>
            <TextInput
              className="border border-border rounded-lg px-4 py-3 text-base text-text bg-card w-24"
              value={form.childrenCount}
              onChangeText={(value) => update('childrenCount', value)}
              keyboardType="number-pad"
              placeholder="1"
              maxLength={1}
            />
          </View>
        )}
      </View>

      <View className="mt-2">
        <Text className="text-text font-semibold mb-1">{t('dealBreakers.title')}</Text>
        <Text className="text-muted text-sm mb-3">{t('dealBreakers.subtitle')}</Text>
        <View className="gap-2">
          <ToggleOption label={t('dealBreakers.noSmokers')} checked={form.noSmokers} onToggle={() => update('noSmokers', !form.noSmokers)} />
          <ToggleOption label={t('dealBreakers.noPets')} checked={form.noPets} onToggle={() => update('noPets', !form.noPets)} />
          <ToggleOption label={t('dealBreakers.noParties')} checked={form.noParties} onToggle={() => update('noParties', !form.noParties)} />
          <ToggleOption label={t('dealBreakers.sameGenderOnly')} checked={form.sameGenderOnly} onToggle={() => update('sameGenderOnly', !form.sameGenderOnly)} />
          <ToggleOption label={t('dealBreakers.quietHoursRequired')} checked={form.quietHoursRequired} onToggle={() => update('quietHoursRequired', !form.quietHoursRequired)} />
          <ToggleOption label={t('dealBreakers.noChildren')} checked={form.noChildren} onToggle={() => update('noChildren', !form.noChildren)} />
          <ToggleOption label={t('dealBreakers.noCouples')} checked={form.noCouples} onToggle={() => update('noCouples', !form.noCouples)} />
        </View>
      </View>
    </View>
  );
}

function ChoiceSection({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly ChoiceOption[];
  onChange: (value: string) => void;
}) {
  return (
    <View>
      <Text className="text-text font-medium mb-2">{label}</Text>
      <ChoiceChips options={options} value={value} onChange={onChange} />
    </View>
  );
}
