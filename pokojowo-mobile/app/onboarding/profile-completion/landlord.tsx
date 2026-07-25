import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { User, Phone, MapPin, FileText, Check, X } from 'lucide-react-native';

import { Button } from '@/components/ui';
import { userService, LandlordProfileData } from '@/services/user.service';
import useAuthStore from '@/stores/authStore';
import useUIStore from '@/stores/uiStore';
import useTheme from '@/hooks/useTheme';

interface FormData {
  firstname: string;
  lastname: string;
  phone: string;
  location: string;
  companyName: string;
  bio: string;
}

export default function LandlordProfileCompletion() {
  const { t } = useTranslation('profile');
  const router = useRouter();
  const { colors } = useTheme();
  const { user, fetchUser } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);
  const confirm = useUIStore((s) => s.confirm);

  const [formData, setFormData] = useState<FormData>({
    firstname: '',
    lastname: '',
    phone: '',
    location: '',
    companyName: '',
    bio: '',
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        firstname: user.firstname || '',
        lastname: user.lastname || '',
        phone: user.phone || '',
        location: user.location || '',
        bio: user.bio || '',
      }));
    }
  }, [user]);

  const saveMutation = useMutation({
    mutationFn: (data: LandlordProfileData) => userService.completeLandlordProfile(data),
    onSuccess: async () => {
      await fetchUser();
      showToast({
        type: 'success',
        message: t(
          'completion.success.landlordDescription',
          'Your landlord profile has been saved. Start listing your properties!'
        ),
      });
      router.replace('/(app)/(landlord)');
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

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.firstname || !formData.lastname) {
      showToast({
        type: 'error',
        message: t('completion.error.requiredFields', 'First name and last name are required.'),
      });
      return;
    }

    const payload: LandlordProfileData = {
      firstname: formData.firstname,
      lastname: formData.lastname,
      phone: formData.phone || undefined,
      location: formData.location || undefined,
      companyName: formData.companyName || undefined,
      bio: formData.bio || undefined,
    };
    saveMutation.mutate(payload);
  };

  const handleSkip = () => {
    router.replace('/(app)/(home)');
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
      router.replace('/(app)/(home)');
    }
  };

  // Calculate progress
  const fields = Object.values(formData);
  const filledFields = fields.filter(Boolean).length;
  const progress = (filledFields / fields.length) * 100;

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="px-4 py-4 border-b border-border">
          <TouchableOpacity
            onPress={handleExit}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel={t('actions.exit', 'Exit')}
            className="absolute right-3 top-4 z-10 w-9 h-9 rounded-full bg-surface items-center justify-center"
          >
            <X size={20} color={colors.muted} />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-text text-center">
            {t('completion.landlord.title', 'Complete Your Landlord Profile')}
          </Text>
          <Text className="text-muted text-center mt-1">
            {t('completion.landlord.subtitle', 'Add your details to start listing properties')}
          </Text>
        </View>

        {/* Progress */}
        <View className="px-4 pt-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm text-muted">
              {t('completion.profileCompletion', 'Profile Completion')}
            </Text>
            <Text className="text-sm font-semibold text-primary-600">{Math.round(progress)}%</Text>
          </View>
          <View className="h-2 bg-surface rounded-full overflow-hidden">
            <View
              className="h-full bg-primary-600 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </View>
        </View>

        {/* Form */}
        <ScrollView className="flex-1 px-4 pt-6" keyboardShouldPersistTaps="handled">
          {/* Name Fields */}
          <View className="bg-surface rounded-xl p-4 mb-4">
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-lg bg-primary-600 items-center justify-center mr-3">
                <User size={20} color="white" />
              </View>
              <Text className="text-lg font-semibold text-text">
                {t('landlord.personalInfo', 'Personal Information')}
              </Text>
            </View>

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-text font-medium mb-2">
                  {t('basicInfo.firstName', 'First Name')} *
                </Text>
                <TextInput
                  className="bg-card border border-border rounded-lg px-4 py-3 text-base text-text"
                  value={formData.firstname}
                  onChangeText={(text) => handleInputChange('firstname', text)}
                  placeholder="John"
                />
              </View>
              <View className="flex-1">
                <Text className="text-text font-medium mb-2">
                  {t('basicInfo.lastName', 'Last Name')} *
                </Text>
                <TextInput
                  className="bg-card border border-border rounded-lg px-4 py-3 text-base text-text"
                  value={formData.lastname}
                  onChangeText={(text) => handleInputChange('lastname', text)}
                  placeholder="Doe"
                />
              </View>
            </View>

            <View>
              <Text className="text-text font-medium mb-2">
                {t('landlord.companyName', 'Company Name (Optional)')}
              </Text>
              <TextInput
                className="bg-card border border-border rounded-lg px-4 py-3 text-base text-text"
                value={formData.companyName}
                onChangeText={(text) => handleInputChange('companyName', text)}
                placeholder={t('landlord.companyPlaceholder', 'Your company or business name')}
              />
            </View>
          </View>

          {/* Contact Fields */}
          <View className="bg-surface rounded-xl p-4 mb-4">
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-lg bg-blue-600 items-center justify-center mr-3">
                <Phone size={20} color="white" />
              </View>
              <Text className="text-lg font-semibold text-text">
                {t('landlord.contactInfo', 'Contact Information')}
              </Text>
            </View>

            <View className="mb-4">
              <Text className="text-text font-medium mb-2">
                {t('contact.phone', 'Phone Number')}
              </Text>
              <TextInput
                className="bg-card border border-border rounded-lg px-4 py-3 text-base text-text"
                value={formData.phone}
                onChangeText={(text) => handleInputChange('phone', text)}
                keyboardType="phone-pad"
                placeholder="+48 123 456 789"
              />
            </View>

            <View>
              <View className="flex-row items-center mb-2">
                <MapPin size={16} color={colors.muted} />
                <Text className="text-text font-medium ml-1">
                  {t('contact.location', 'City / Location')}
                </Text>
              </View>
              <TextInput
                className="bg-card border border-border rounded-lg px-4 py-3 text-base text-text"
                value={formData.location}
                onChangeText={(text) => handleInputChange('location', text)}
                placeholder="e.g., Warsaw, Krakow"
              />
            </View>
          </View>

          {/* Bio */}
          <View className="bg-surface rounded-xl p-4 mb-4">
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-lg bg-green-600 items-center justify-center mr-3">
                <FileText size={20} color="white" />
              </View>
              <Text className="text-lg font-semibold text-text">
                {t('landlord.aboutYou', 'About You')}
              </Text>
            </View>

            <Text className="text-text font-medium mb-2">
              {t('landlord.bio', 'About You / Your Properties')}
            </Text>
            <TextInput
              className="bg-card border border-border rounded-lg px-4 py-3 text-base text-text"
              value={formData.bio}
              onChangeText={(text) => handleInputChange('bio', text)}
              placeholder={t('landlord.bioPlaceholder', 'Tell potential tenants about yourself and your properties...')}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{ minHeight: 100 }}
            />
          </View>

          <View className="h-32" />
        </ScrollView>

        {/* Action Buttons */}
        <View className="flex-row gap-3 p-4 border-t border-border bg-bg">
          <Button variant="outline" className="flex-1" onPress={handleSkip}>
            <Text className="text-text">{t('actions.skipForNow', 'Skip for now')}</Text>
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onPress={handleSubmit}
            disabled={saveMutation.isPending}
          >
            <View className="flex-row items-center">
              <Text className="text-white mr-1">
                {saveMutation.isPending
                  ? t('actions.saving', 'Saving...')
                  : t('actions.complete', 'Complete Profile')}
              </Text>
              {!saveMutation.isPending && <Check size={18} color="white" />}
            </View>
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
