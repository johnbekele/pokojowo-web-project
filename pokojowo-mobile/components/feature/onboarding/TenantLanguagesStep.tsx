import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SUPPORTED_LANGUAGES } from '@/lib/languages';
import type { TenantFormData, UpdateTenantField } from './tenant.types';

interface Props {
  form: TenantFormData;
  update: UpdateTenantField;
  customLanguage: string;
  setCustomLanguage: (value: string) => void;
}

export default function TenantLanguagesStep({ form, update, customLanguage, setCustomLanguage }: Props) {
  const { t } = useTranslation('profile');
  const addLanguage = () => {
    const cleaned = customLanguage.trim().replace(/\s+/g, ' ');
    if (!cleaned) return;
    const titled = cleaned
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    if (!form.languages.some((language) => language.toLowerCase() === titled.toLowerCase())) {
      update('languages', [...form.languages, titled]);
    }
    setCustomLanguage('');
  };

  return (
    <View className="gap-4">
      <View>
        <Text className="text-text font-medium mb-2">{t('languages.select')}</Text>
        <View className="flex-row flex-wrap gap-2">
          {SUPPORTED_LANGUAGES.map((language) => {
            const selected = form.languages.includes(language);
            return (
              <TouchableOpacity
                key={language}
                onPress={() => update('languages', selected ? form.languages.filter((item) => item !== language) : [...form.languages, language])}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                className={`px-4 py-2.5 rounded-lg border ${selected ? 'bg-primary-600 border-primary-600' : 'bg-card border-border'}`}
              >
                <Text className={`font-medium ${selected ? 'text-white' : 'text-text'}`}>
                  {t(`languages.options.${language.toLowerCase()}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View>
        <Text className="text-text font-medium mb-2">{t('languages.other')}</Text>
        <View className="flex-row gap-2">
          <TextInput
            className="flex-1 border border-border rounded-lg px-4 py-3 text-base text-text bg-card"
            value={customLanguage}
            onChangeText={setCustomLanguage}
            placeholder={t('languages.otherPlaceholder')}
          />
          <TouchableOpacity
            disabled={!customLanguage.trim()}
            onPress={addLanguage}
            accessibilityRole="button"
            className={`px-4 rounded-lg border items-center justify-center ${customLanguage.trim() ? 'bg-primary-600 border-primary-600' : 'bg-surface border-border'}`}
          >
            <Text className={customLanguage.trim() ? 'text-white font-medium' : 'text-muted font-medium'}>{t('languages.add')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {form.languages.filter((language) => !SUPPORTED_LANGUAGES.includes(language)).length > 0 && (
        <View className="flex-row flex-wrap gap-2">
          {form.languages
            .filter((language) => !SUPPORTED_LANGUAGES.includes(language))
            .map((language) => (
              <TouchableOpacity
                key={language}
                onPress={() => update('languages', form.languages.filter((item) => item !== language))}
                accessibilityRole="button"
                accessibilityLabel={t('languages.remove', { language })}
                className="flex-row items-center px-3 py-2 rounded-lg bg-primary-50 border border-primary-300"
              >
                <Text className="text-primary-700 font-medium mr-1">{language}</Text>
                <Text className="text-primary-400">×</Text>
              </TouchableOpacity>
            ))}
        </View>
      )}

      {form.languages.length > 0 && (
        <View>
          <Text className="text-text font-medium mb-2">{t('languages.preferredLanguage')}</Text>
          <View className="flex-row flex-wrap gap-2">
            {form.languages.map((language) => {
              const selected = form.preferredLanguage === language;
              return (
                <TouchableOpacity
                  key={language}
                  onPress={() => update('preferredLanguage', language)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  className={`px-4 py-2.5 rounded-lg border ${selected ? 'bg-primary-600 border-primary-600' : 'bg-card border-border'}`}
                >
                  <Text className={`font-medium ${selected ? 'text-white' : 'text-text'}`}>
                    {t(`languages.options.${language.toLowerCase()}`, language)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
