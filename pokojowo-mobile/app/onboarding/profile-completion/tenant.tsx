import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
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
  X,
} from 'lucide-react-native';

import { Button } from '@/components/ui';
import { usePreferredArea } from '@/hooks/user/usePreferredArea';
import { userService, TenantProfileData } from '@/services/user.service';
import useAuthStore from '@/stores/authStore';
import useUIStore from '@/stores/uiStore';
import useTheme from '@/hooks/useTheme';
import TenantBasicStep from '@/components/feature/onboarding/TenantBasicStep';
import TenantContactStep from '@/components/feature/onboarding/TenantContactStep';
import TenantPreferencesStep from '@/components/feature/onboarding/TenantPreferencesStep';
import TenantLifestyleStep from '@/components/feature/onboarding/TenantLifestyleStep';
import TenantLanguagesStep from '@/components/feature/onboarding/TenantLanguagesStep';
import type { TenantFormData } from '@/components/feature/onboarding/tenant.types';

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
  { id: 'basic', titleKey: 'basicInfo.title', icon: User },
  { id: 'contact', titleKey: 'contact.title', icon: Phone },
  { id: 'preferences', titleKey: 'preferences.title', icon: Settings },
  { id: 'lifestyle', titleKey: 'lifestyle.title', icon: Heart },
  { id: 'languages', titleKey: 'languages.title', icon: Languages },
];

export default function TenantProfileCompletion() {
  const { t } = useTranslation('profile');
  const router = useRouter();
  const { colors } = useTheme();
  const { user, fetchUser } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);
  const confirm = useUIStore((s) => s.confirm);

  const [currentStep, setCurrentStep] = useState(0);
  const [dobError, setDobError] = useState('');
  const [customLanguage, setCustomLanguage] = useState('');
  const [formData, setFormData] = useState<TenantFormData>({
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
    preferredDistricts: [],
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

  const { data: preferredArea } = usePreferredArea();

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

  // Someone revisiting onboarding shouldn't have to re-pick an area they
  // already chose; GET /users/me doesn't carry tenantProfile, hence the
  // separate fetch.
  useEffect(() => {
    if (!preferredArea) return;
    setFormData((prev) => ({
      ...prev,
      preferredLocation: prev.preferredLocation || preferredArea.location || '',
      preferredDistricts: prev.preferredDistricts.length
        ? prev.preferredDistricts
        : preferredArea.districts,
    }));
  }, [preferredArea]);

  const saveMutation = useMutation({
    mutationFn: (data: TenantProfileData) => userService.completeTenantProfile(data),
    onSuccess: async () => {
      await fetchUser();
      showToast({
        type: 'success',
        message: t('completion.success.description', 'Your profile has been saved successfully.'),
      });
      router.replace('/(app)/(matches)');
    },
    onError: (error: unknown) => {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      showToast({
        type: 'error',
        message: detail || t('completion.error.description', 'Failed to save profile.'),
      });
    },
  });

  const handleInputChange = <K extends keyof TenantFormData,>(field: K, value: TenantFormData[K]) => {
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

  const handleExit = async () => {
    const confirmed = await confirm({
      title: t('completion.exit.title', 'Exit profile setup?'),
      message: t(
        'completion.exit.description',
        'Your progress on this step will not be saved. You can finish your profile later.'
      ),
      confirmLabel: t('actions.exit', 'Exit'),
      cancelLabel: t('actions.cancel', 'Cancel'),
      destructive: true,
    });
    if (!confirmed) return;
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/(matches)');
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
          districts: formData.preferredDistricts,
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <TenantBasicStep
            form={formData}
            update={handleInputChange}
            dobError={dobError}
            onDobChange={(value) => {
              handleInputChange('dateOfBirth', value);
              setDobError('');
            }}
          />
        );
      case 1:
        return <TenantContactStep form={formData} update={handleInputChange} />;
      case 2:
        return (
          <TenantPreferencesStep
            form={formData}
            update={handleInputChange}
            onAreaChange={(city, districts) =>
              setFormData((prev) => ({ ...prev, preferredLocation: city, preferredDistricts: districts }))
            }
          />
        );
      case 3:
        return <TenantLifestyleStep form={formData} update={handleInputChange} />;
      case 4:
        return (
          <TenantLanguagesStep
            form={formData}
            update={handleInputChange}
            customLanguage={customLanguage}
            setCustomLanguage={setCustomLanguage}
          />
        );
      default:
        return null;
    }
  };
  const CurrentIcon = STEPS[currentStep].icon;

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="px-4 py-3 border-b border-border">
          <TouchableOpacity
            onPress={handleExit}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel={t('actions.exit', 'Exit')}
            className="absolute right-3 top-3 z-10 w-9 h-9 rounded-full bg-surface items-center justify-center"
          >
            <X size={20} color={colors.muted} />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-text text-center">
            {t('completion.title', 'Complete Your Profile')}
          </Text>
          <Text className="text-muted text-center mt-1">
            {t('completion.subtitle', 'Help us find your perfect match')}
          </Text>
        </View>

        {/* Progress */}
        <View className="px-4 pt-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm text-muted">
              {t('completion.step', 'Step')} {currentStep + 1} {t('completion.of', 'of')} {STEPS.length}
            </Text>
            <Text className="text-sm font-semibold text-primary-600">{Math.round(progress)}%</Text>
          </View>
          <View className="h-2 bg-surface rounded-full overflow-hidden">
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
                        : 'bg-surface'
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={18} color="white" />
                    ) : (
                      <StepIcon size={18} color={isCurrent ? 'white' : colors.muted} />
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
            <Text className="text-xl font-semibold text-text">{t(STEPS[currentStep].titleKey)}</Text>
          </View>

          {renderStepContent()}

          <View className="h-32" />
        </ScrollView>

        {/* Navigation */}
        <View className="flex-row gap-3 p-4 border-t border-border bg-bg">
          <Button
            variant="outline"
            className="flex-1"
            onPress={handleBack}
            disabled={currentStep === 0}
          >
            <View className="flex-row items-center">
              <ChevronLeft size={18} color={colors.muted} />
              <Text className="ml-1 text-text">{t('actions.back', 'Back')}</Text>
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
