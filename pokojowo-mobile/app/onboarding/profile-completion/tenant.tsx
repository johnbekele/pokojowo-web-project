import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import {
  User,
  Phone,
  Settings,
  Heart,
  Languages,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react-native';

import { Button } from '@/components/ui';
import { userService, TenantProfileData } from '@/services/user.service';
import useAuthStore from '@/stores/authStore';
import { COLORS } from '@/lib/constants';
import { SUPPORTED_LANGUAGES } from '@/lib/languages';

// Latest valid birth date: exactly 18 years ago today
const maxDateOfBirth = (): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
};

const DOB_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isValidDob = (value: string): boolean => {
  if (!DOB_PATTERN.test(value)) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return value <= maxDateOfBirth();
};

const STEPS = [
  { id: 'basic', title: 'Basic Info', icon: User },
  { id: 'contact', title: 'Contact', icon: Phone },
  { id: 'preferences', title: 'Preferences', icon: Settings },
  { id: 'lifestyle', title: 'Lifestyle', icon: Heart },
  { id: 'languages', title: 'Languages', icon: Languages },
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const CLEANLINESS_OPTIONS = [
  { value: 'very_clean', label: 'Very Clean' },
  { value: 'clean', label: 'Clean' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'relaxed', label: 'Relaxed' },
];

const SOCIAL_OPTIONS = [
  { value: 'very_social', label: 'Very Social' },
  { value: 'social', label: 'Social' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'quiet', label: 'Quiet' },
];

const GUESTS_OPTIONS = [
  { value: 'often', label: 'Often' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'rarely', label: 'Rarely' },
  { value: 'never', label: 'Never' },
];

interface FormData {
  firstname: string;
  lastname: string;
  dateOfBirth: string;
  gender: string;
  bio: string;
  phone: string;
  location: string;
  budgetMin: string;
  budgetMax: string;
  preferredLocation: string;
  leaseDuration: string;
  cleanliness: string;
  socialLevel: string;
  guestsFrequency: string;
  noSmokers: boolean;
  noPets: boolean;
  noParties: boolean;
  sameGenderOnly: boolean;
  quietHoursRequired: boolean;
  noChildren: boolean;
  noCouples: boolean;
  hasPartner: boolean;
  hasChildren: boolean;
  childrenCount: string;
  languages: string[];
  preferredLanguage: string;
}

export default function TenantProfileCompletion() {
  const { t } = useTranslation('profile');
  const router = useRouter();
  const { user, fetchUser } = useAuthStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [dobError, setDobError] = useState('');
  const [customLanguage, setCustomLanguage] = useState('');
  const [formData, setFormData] = useState<FormData>({
    firstname: '',
    lastname: '',
    dateOfBirth: '',
    gender: '',
    bio: '',
    phone: '',
    location: '',
    budgetMin: '',
    budgetMax: '',
    preferredLocation: '',
    leaseDuration: '12',
    cleanliness: '',
    socialLevel: '',
    guestsFrequency: '',
    noSmokers: false,
    noPets: false,
    noParties: false,
    sameGenderOnly: false,
    quietHoursRequired: false,
    noChildren: false,
    noCouples: false,
    hasPartner: false,
    hasChildren: false,
    childrenCount: '',
    languages: [],
    preferredLanguage: '',
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        firstname: user.firstname || '',
        lastname: user.lastname || '',
        dateOfBirth: user.dateOfBirth ? String(user.dateOfBirth).slice(0, 10) : '',
        gender: user.gender || '',
        bio: user.bio || '',
        phone: user.phone || '',
        location: user.location || '',
        languages: user.languages || [],
        preferredLanguage: user.preferred_language || '',
      }));
    }
  }, [user]);

  const saveMutation = useMutation({
    mutationFn: (data: TenantProfileData) => userService.completeTenantProfile(data),
    onSuccess: async () => {
      await fetchUser();
      Alert.alert(
        t('completion.success.title', 'Profile Complete'),
        t('completion.success.description', 'Your profile has been saved successfully.')
      );
      router.replace('/(app)/(matches)');
    },
    onError: (error: any) => {
      Alert.alert(
        t('completion.error.title', 'Error'),
        error.response?.data?.detail || t('completion.error.description', 'Failed to save profile.')
      );
    },
  });

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep === 0 && formData.dateOfBirth && !isValidDob(formData.dateOfBirth)) {
      setDobError(t('validation.mustBe18', 'You must be at least 18 years old (format: YYYY-MM-DD).'));
      return;
    }
    setDobError('');
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    const payload: TenantProfileData = {
      firstname: formData.firstname,
      lastname: formData.lastname,
      dateOfBirth: formData.dateOfBirth || null,
      gender: formData.gender || null,
      bio: formData.bio,
      phone: formData.phone,
      location: formData.location,
      languages: formData.languages,
      preferredLanguage: formData.preferredLanguage || null,
      tenantProfile: {
        preferences: {
          budget: {
            min: formData.budgetMin ? parseInt(formData.budgetMin) : null,
            max: formData.budgetMax ? parseInt(formData.budgetMax) : null,
          },
          location: formData.preferredLocation || null,
          leaseDuration: parseInt(formData.leaseDuration),
        },
        flatmateTraits: {
          cleanliness: formData.cleanliness || null,
          socialLevel: formData.socialLevel || null,
          guestsFrequency: formData.guestsFrequency || null,
        },
        dealBreakers: {
          noSmokers: formData.noSmokers,
          noPets: formData.noPets,
          noParties: formData.noParties,
          sameGenderOnly: formData.sameGenderOnly,
          quietHoursRequired: formData.quietHoursRequired,
          noChildren: formData.noChildren,
          noCouples: formData.noCouples,
        },
        hasPartner: formData.hasPartner,
        hasChildren: formData.hasChildren,
        childrenCount:
          formData.hasChildren && formData.childrenCount
            ? parseInt(formData.childrenCount)
            : null,
      },
    };
    saveMutation.mutate(payload);
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const renderSelectOption = (
    options: { value: string; label: string }[],
    selectedValue: string,
    onSelect: (value: string) => void
  ) => (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          onPress={() => onSelect(option.value)}
          className={`px-4 py-2.5 rounded-lg border ${
            selectedValue === option.value
              ? 'bg-primary-600 border-primary-600'
              : 'bg-white border-gray-200'
          }`}
        >
          <Text
            className={`font-medium ${
              selectedValue === option.value ? 'text-white' : 'text-gray-700'
            }`}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderCheckboxOption = (
    label: string,
    checked: boolean,
    onToggle: () => void
  ) => (
    <TouchableOpacity
      onPress={onToggle}
      className={`flex-row items-center p-3 rounded-lg border ${
        checked ? 'bg-primary-50 border-primary-300' : 'bg-white border-gray-200'
      }`}
    >
      <View
        className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center ${
          checked ? 'bg-primary-600 border-primary-600' : 'border-gray-300'
        }`}
      >
        {checked && <Check size={14} color="white" />}
      </View>
      <Text className="text-gray-700 flex-1">{label}</Text>
    </TouchableOpacity>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basic Info
        return (
          <View className="gap-4">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-gray-700 font-medium mb-2">{t('basicInfo.firstName', 'First Name')}</Text>
                <TextInput
                  className="border border-gray-200 rounded-lg px-4 py-3 text-base"
                  value={formData.firstname}
                  onChangeText={(text) => handleInputChange('firstname', text)}
                  placeholder="John"
                />
              </View>
              <View className="flex-1">
                <Text className="text-gray-700 font-medium mb-2">{t('basicInfo.lastName', 'Last Name')}</Text>
                <TextInput
                  className="border border-gray-200 rounded-lg px-4 py-3 text-base"
                  value={formData.lastname}
                  onChangeText={(text) => handleInputChange('lastname', text)}
                  placeholder="Doe"
                />
              </View>
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2">{t('basicInfo.dateOfBirth', 'Date of birth')}</Text>
              <TextInput
                className="border border-gray-200 rounded-lg px-4 py-3 text-base"
                value={formData.dateOfBirth}
                onChangeText={(text) => {
                  handleInputChange('dateOfBirth', text);
                  setDobError('');
                }}
                keyboardType="numbers-and-punctuation"
                placeholder="YYYY-MM-DD"
                maxLength={10}
              />
              {dobError ? (
                <Text className="text-red-500 text-xs mt-1">{dobError}</Text>
              ) : (
                <Text className="text-gray-400 text-xs mt-1">
                  {t('basicInfo.dateOfBirthHint', 'Your age updates automatically; others only see your age.')}
                </Text>
              )}
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2">{t('basicInfo.gender', 'Gender')}</Text>
              {renderSelectOption(GENDER_OPTIONS, formData.gender, (v) => handleInputChange('gender', v))}
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2">{t('basicInfo.bio', 'About Me')}</Text>
              <TextInput
                className="border border-gray-200 rounded-lg px-4 py-3 text-base"
                value={formData.bio}
                onChangeText={(text) => handleInputChange('bio', text)}
                placeholder={t('basicInfo.bioPlaceholder', 'Tell us about yourself...')}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={{ minHeight: 100 }}
              />
            </View>
          </View>
        );

      case 1: // Contact
        return (
          <View className="gap-4">
            <View>
              <Text className="text-gray-700 font-medium mb-2">{t('contact.phone', 'Phone Number')}</Text>
              <TextInput
                className="border border-gray-200 rounded-lg px-4 py-3 text-base"
                value={formData.phone}
                onChangeText={(text) => handleInputChange('phone', text)}
                keyboardType="phone-pad"
                placeholder="+48 123 456 789"
              />
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2">{t('contact.location', 'City / Location')}</Text>
              <TextInput
                className="border border-gray-200 rounded-lg px-4 py-3 text-base"
                value={formData.location}
                onChangeText={(text) => handleInputChange('location', text)}
                placeholder="e.g., Warsaw, Krakow"
              />
            </View>
          </View>
        );

      case 2: // Preferences
        return (
          <View className="gap-4">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-gray-700 font-medium mb-2">{t('preferences.budgetMin', 'Min Budget')} (PLN)</Text>
                <TextInput
                  className="border border-gray-200 rounded-lg px-4 py-3 text-base"
                  value={formData.budgetMin}
                  onChangeText={(text) => handleInputChange('budgetMin', text)}
                  keyboardType="number-pad"
                  placeholder="1000"
                />
              </View>
              <View className="flex-1">
                <Text className="text-gray-700 font-medium mb-2">{t('preferences.budgetMax', 'Max Budget')} (PLN)</Text>
                <TextInput
                  className="border border-gray-200 rounded-lg px-4 py-3 text-base"
                  value={formData.budgetMax}
                  onChangeText={(text) => handleInputChange('budgetMax', text)}
                  keyboardType="number-pad"
                  placeholder="3000"
                />
              </View>
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2">{t('preferences.location', 'Preferred Location')}</Text>
              <TextInput
                className="border border-gray-200 rounded-lg px-4 py-3 text-base"
                value={formData.preferredLocation}
                onChangeText={(text) => handleInputChange('preferredLocation', text)}
                placeholder="e.g., City center, Mokotow"
              />
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2">{t('preferences.leaseDuration', 'Lease Duration')}</Text>
              <View className="flex-row flex-wrap gap-2">
                {['3', '6', '12', '24'].map((months) => (
                  <TouchableOpacity
                    key={months}
                    onPress={() => handleInputChange('leaseDuration', months)}
                    className={`px-4 py-2.5 rounded-lg border ${
                      formData.leaseDuration === months
                        ? 'bg-primary-600 border-primary-600'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <Text
                      className={`font-medium ${
                        formData.leaseDuration === months ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      {months}{months === '24' ? '+' : ''} {t('preferences.months', 'months')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );

      case 3: // Lifestyle
        return (
          <View className="gap-5">
            <View>
              <Text className="text-gray-700 font-medium mb-2">{t('lifestyle.cleanliness.label', 'Cleanliness Level')}</Text>
              {renderSelectOption(CLEANLINESS_OPTIONS, formData.cleanliness, (v) => handleInputChange('cleanliness', v))}
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2">{t('lifestyle.socialLevel.label', 'Social Level')}</Text>
              {renderSelectOption(SOCIAL_OPTIONS, formData.socialLevel, (v) => handleInputChange('socialLevel', v))}
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2">{t('lifestyle.guests.label', 'Guest Frequency')}</Text>
              {renderSelectOption(GUESTS_OPTIONS, formData.guestsFrequency, (v) => handleInputChange('guestsFrequency', v))}
            </View>

            <View className="mt-2">
              <Text className="text-gray-700 font-semibold mb-1">{t('coOccupants.title', 'Who will live with you?')}</Text>
              <Text className="text-gray-500 text-sm mb-3">{t('coOccupants.subtitle', 'Let flatmates know who is moving in with you.')}</Text>
              <View className="gap-2">
                {renderCheckboxOption(t('coOccupants.partner', "I'll move in with a partner"), formData.hasPartner, () => handleInputChange('hasPartner', !formData.hasPartner))}
                {renderCheckboxOption(t('coOccupants.children', 'I have children living with me'), formData.hasChildren, () => handleInputChange('hasChildren', !formData.hasChildren))}
              </View>
              {formData.hasChildren && (
                <View className="mt-3">
                  <Text className="text-gray-700 font-medium mb-2">{t('coOccupants.childrenCount', 'How many children?')}</Text>
                  <TextInput
                    className="border border-gray-200 rounded-lg px-4 py-3 text-base w-24"
                    value={formData.childrenCount}
                    onChangeText={(text) => handleInputChange('childrenCount', text)}
                    keyboardType="number-pad"
                    placeholder="1"
                    maxLength={1}
                  />
                </View>
              )}
            </View>

            <View className="mt-2">
              <Text className="text-gray-700 font-semibold mb-1">{t('dealBreakers.title', 'Deal Breakers')}</Text>
              <Text className="text-gray-500 text-sm mb-3">{t('dealBreakers.subtitle', "What's absolutely not acceptable?")}</Text>
              <View className="gap-2">
                {renderCheckboxOption(t('dealBreakers.noSmokers', 'No smokers'), formData.noSmokers, () => handleInputChange('noSmokers', !formData.noSmokers))}
                {renderCheckboxOption(t('dealBreakers.noPets', 'No pets'), formData.noPets, () => handleInputChange('noPets', !formData.noPets))}
                {renderCheckboxOption(t('dealBreakers.noParties', 'No parties'), formData.noParties, () => handleInputChange('noParties', !formData.noParties))}
                {renderCheckboxOption(t('dealBreakers.sameGenderOnly', 'Same gender only'), formData.sameGenderOnly, () => handleInputChange('sameGenderOnly', !formData.sameGenderOnly))}
                {renderCheckboxOption(t('dealBreakers.quietHoursRequired', 'Quiet hours required'), formData.quietHoursRequired, () => handleInputChange('quietHoursRequired', !formData.quietHoursRequired))}
                {renderCheckboxOption(t('dealBreakers.noChildren', 'Prefer no children in the flat'), formData.noChildren, () => handleInputChange('noChildren', !formData.noChildren))}
                {renderCheckboxOption(t('dealBreakers.noCouples', 'Prefer no couples'), formData.noCouples, () => handleInputChange('noCouples', !formData.noCouples))}
              </View>
            </View>
          </View>
        );

      case 4: // Languages
        return (
          <View className="gap-4">
            <View>
              <Text className="text-gray-700 font-medium mb-2">{t('languages.select', 'Select languages you speak')}</Text>
              <View className="flex-row flex-wrap gap-2">
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isSelected = formData.languages.includes(lang);
                  return (
                    <TouchableOpacity
                      key={lang}
                      onPress={() => {
                        if (isSelected) {
                          handleInputChange('languages', formData.languages.filter((l) => l !== lang));
                        } else {
                          handleInputChange('languages', [...formData.languages, lang]);
                        }
                      }}
                      className={`px-4 py-2.5 rounded-lg border ${
                        isSelected ? 'bg-primary-600 border-primary-600' : 'bg-white border-gray-200'
                      }`}
                    >
                      <Text className={`font-medium ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                        {lang}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2">{t('languages.other', 'Other language')}</Text>
              <View className="flex-row gap-2">
                <TextInput
                  className="flex-1 border border-gray-200 rounded-lg px-4 py-3 text-base"
                  value={customLanguage}
                  onChangeText={setCustomLanguage}
                  placeholder={t('languages.otherPlaceholder', 'e.g. Czech, Portuguese…')}
                />
                <TouchableOpacity
                  disabled={!customLanguage.trim()}
                  onPress={() => {
                    const cleaned = customLanguage.trim().replace(/\s+/g, ' ');
                    if (!cleaned) return;
                    const titled = cleaned
                      .split(' ')
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                      .join(' ');
                    if (!formData.languages.some((l) => l.toLowerCase() === titled.toLowerCase())) {
                      handleInputChange('languages', [...formData.languages, titled]);
                    }
                    setCustomLanguage('');
                  }}
                  className={`px-4 rounded-lg border items-center justify-center ${
                    customLanguage.trim() ? 'bg-primary-600 border-primary-600' : 'bg-gray-100 border-gray-200'
                  }`}
                >
                  <Text className={customLanguage.trim() ? 'text-white font-medium' : 'text-gray-400 font-medium'}>
                    {t('languages.add', 'Add')}
                  </Text>
                </TouchableOpacity>
              </View>
              {formData.languages.filter((l) => !SUPPORTED_LANGUAGES.includes(l)).length > 0 && (
                <View className="flex-row flex-wrap gap-2 mt-2">
                  {formData.languages
                    .filter((l) => !SUPPORTED_LANGUAGES.includes(l))
                    .map((lang) => (
                      <TouchableOpacity
                        key={lang}
                        onPress={() =>
                          handleInputChange('languages', formData.languages.filter((l) => l !== lang))
                        }
                        className="flex-row items-center px-3 py-2 rounded-lg bg-primary-50 border border-primary-300"
                      >
                        <Text className="text-primary-700 font-medium mr-1">{lang}</Text>
                        <Text className="text-primary-400">×</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              )}
            </View>

            {formData.languages.length > 0 && (
              <View>
                <Text className="text-gray-700 font-medium mb-2">{t('languages.preferredLanguage', 'Preferred Language')}</Text>
                <View className="flex-row flex-wrap gap-2">
                  {formData.languages.map((lang) => (
                    <TouchableOpacity
                      key={lang}
                      onPress={() => handleInputChange('preferredLanguage', lang)}
                      className={`px-4 py-2.5 rounded-lg border ${
                        formData.preferredLanguage === lang
                          ? 'bg-primary-600 border-primary-600'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <Text
                        className={`font-medium ${
                          formData.preferredLanguage === lang ? 'text-white' : 'text-gray-700'
                        }`}
                      >
                        {lang}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  const CurrentIcon = STEPS[currentStep].icon;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="px-4 py-3 border-b border-gray-100">
          <Text className="text-2xl font-bold text-gray-900 text-center">
            {t('completion.title', 'Complete Your Profile')}
          </Text>
          <Text className="text-gray-500 text-center mt-1">
            {t('completion.subtitle', 'Help us find your perfect match')}
          </Text>
        </View>

        {/* Progress */}
        <View className="px-4 pt-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm text-gray-600">
              {t('completion.step', 'Step')} {currentStep + 1} {t('completion.of', 'of')} {STEPS.length}
            </Text>
            <Text className="text-sm font-semibold text-primary-600">{Math.round(progress)}%</Text>
          </View>
          <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <View
              className="h-full bg-primary-600 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </View>

          {/* Step indicators */}
          <View className="flex-row justify-between mt-4">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              return (
                <View
                  key={step.id}
                  className={`items-center ${index <= currentStep ? 'opacity-100' : 'opacity-40'}`}
                >
                  <View
                    className={`w-10 h-10 rounded-xl items-center justify-center ${
                      isCompleted
                        ? 'bg-green-500'
                        : isCurrent
                        ? 'bg-primary-600'
                        : 'bg-gray-200'
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={18} color="white" />
                    ) : (
                      <StepIcon size={18} color={isCurrent ? 'white' : COLORS.gray[500]} />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Form Content */}
        <ScrollView className="flex-1 px-4 pt-6" keyboardShouldPersistTaps="handled">
          <View className="flex-row items-center gap-3 mb-4">
            <View className="w-10 h-10 rounded-lg bg-primary-600 items-center justify-center">
              <CurrentIcon size={20} color="white" />
            </View>
            <Text className="text-xl font-semibold text-gray-900">{STEPS[currentStep].title}</Text>
          </View>

          {renderStepContent()}

          <View className="h-32" />
        </ScrollView>

        {/* Navigation */}
        <View className="flex-row gap-3 p-4 border-t border-gray-100 bg-white">
          <Button
            variant="outline"
            className="flex-1"
            onPress={handleBack}
            disabled={currentStep === 0}
          >
            <View className="flex-row items-center">
              <ChevronLeft size={18} color={COLORS.gray[600]} />
              <Text className="ml-1 text-gray-700">{t('actions.back', 'Back')}</Text>
            </View>
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onPress={handleNext}
            disabled={saveMutation.isPending}
          >
            <View className="flex-row items-center">
              <Text className="text-white mr-1">
                {saveMutation.isPending
                  ? t('actions.saving', 'Saving...')
                  : currentStep === STEPS.length - 1
                  ? t('actions.complete', 'Complete')
                  : t('actions.next', 'Next')}
              </Text>
              {currentStep === STEPS.length - 1 ? (
                <Check size={18} color="white" />
              ) : (
                <ChevronRight size={18} color="white" />
              )}
            </View>
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
