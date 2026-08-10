import { Check } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ChoiceOption } from './tenant.types';

export const CHOICES = {
  gender: [
    { value: 'male', labelKey: 'basicInfo.genderOptions.male' },
    { value: 'female', labelKey: 'basicInfo.genderOptions.female' },
    { value: 'other', labelKey: 'basicInfo.genderOptions.other' },
  ],
  cleanliness: [
    { value: 'very_clean', labelKey: 'lifestyle.cleanliness.veryClean' },
    { value: 'clean', labelKey: 'lifestyle.cleanliness.clean' },
    { value: 'moderate', labelKey: 'lifestyle.cleanliness.moderate' },
    { value: 'relaxed', labelKey: 'lifestyle.cleanliness.relaxed' },
  ],
  social: [
    { value: 'very_social', labelKey: 'lifestyle.socialLevel.verySocial' },
    { value: 'social', labelKey: 'lifestyle.socialLevel.social' },
    { value: 'moderate', labelKey: 'lifestyle.socialLevel.moderate' },
    { value: 'quiet', labelKey: 'lifestyle.socialLevel.quiet' },
  ],
  guests: [
    { value: 'often', labelKey: 'lifestyle.guests.often' },
    { value: 'sometimes', labelKey: 'lifestyle.guests.sometimes' },
    { value: 'rarely', labelKey: 'lifestyle.guests.rarely' },
    { value: 'never', labelKey: 'lifestyle.guests.never' },
  ],
} as const;

interface ChoiceChipsProps {
  options: readonly ChoiceOption[];
  value: string;
  onChange: (value: string) => void;
}

export function ChoiceChips({ options, value, onChange }: ChoiceChipsProps) {
  const { t } = useTranslation('profile');
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            className={`px-4 py-2.5 rounded-lg border ${
              selected ? 'bg-primary-600 border-primary-600' : 'bg-card border-border'
            }`}
          >
            <Text className={`font-medium ${selected ? 'text-white' : 'text-text'}`}>
              {t(option.labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

interface ToggleOptionProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
}

export function ToggleOption({ label, checked, onToggle }: ToggleOptionProps) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      className={`flex-row items-center p-3 rounded-lg border ${
        checked ? 'bg-primary-50 border-primary-300' : 'bg-card border-border'
      }`}
    >
      <View
        className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center ${
          checked ? 'bg-primary-600 border-primary-600' : 'border-border'
        }`}
      >
        {checked && <Check size={14} color="white" />}
      </View>
      <Text className="text-text flex-1">{label}</Text>
    </TouchableOpacity>
  );
}
