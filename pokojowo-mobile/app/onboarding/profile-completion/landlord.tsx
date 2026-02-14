import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { User, Phone, MapPin, FileText, Check } from 'lucide-react-native';

import { Button } from '@/components/ui';
import { userService, LandlordProfileData } from '@/services/user.service';
import useAuthStore from '@/stores/authStore';
import { COLORS } from '@/lib/constants';

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
  const { user, fetchUser } = useAuthStore();

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
      Alert.alert(
        t('completion.success.title', 'Profile Complete'),
        t('completion.success.landlordDescription', 'Your landlord profile has been saved. Start listing your properties!')
      );
      router.replace('/(app)/(landlord)');
    },
    onError: (error: any) => {
      Alert.alert(
        t('completion.error.title', 'Error'),
        error.response?.data?.detail || t('completion.error.description', 'Failed to save profile.')
      );
    },
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.firstname || !formData.lastname) {
      Alert.alert(
        t('completion.error.title', 'Error'),
        t('completion.error.requiredFields', 'First name and last name are required.')
      );
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

  // Calculate progress
  const fields = Object.values(formData);
  const filledFields = fields.filter(Boolean).length;
  const progress = (filledFields / fields.length) * 100;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="px-4 py-4 border-b border-gray-100">
          <Text className="text-2xl font-bold text-gray-900 text-center">
            {t('completion.landlord.title', 'Complete Your Landlord Profile')}
          </Text>
          <Text className="text-gray-500 text-center mt-1">
            {t('completion.landlord.subtitle', 'Add your details to start listing properties')}
          </Text>
        </View>

        {/* Progress */}
        <View className="px-4 pt-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm text-gray-600">
              {t('completion.profileCompletion', 'Profile Completion')}
            </Text>
            <Text className="text-sm font-semibold text-primary-600">{Math.round(progress)}%</Text>
          </View>
          <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <View
              className="h-full bg-primary-600 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </View>
        </View>

        {/* Form */}
        <ScrollView className="flex-1 px-4 pt-6" keyboardShouldPersistTaps="handled">
          {/* Name Fields */}
          <View className="bg-gray-50 rounded-xl p-4 mb-4">
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-lg bg-primary-600 items-center justify-center mr-3">
                <User size={20} color="white" />
              </View>
              <Text className="text-lg font-semibold text-gray-900">
                {t('landlord.personalInfo', 'Personal Information')}
              </Text>
            </View>

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-gray-700 font-medium mb-2">
                  {t('basicInfo.firstName', 'First Name')} *
                </Text>
                <TextInput
                  className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-base"
                  value={formData.firstname}
                  onChangeText={(text) => handleInputChange('firstname', text)}
                  placeholder="John"
                />
              </View>
              <View className="flex-1">
                <Text className="text-gray-700 font-medium mb-2">
                  {t('basicInfo.lastName', 'Last Name')} *
                </Text>
                <TextInput
                  className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-base"
                  value={formData.lastname}
                  onChangeText={(text) => handleInputChange('lastname', text)}
                  placeholder="Doe"
                />
              </View>
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2">
                {t('landlord.companyName', 'Company Name (Optional)')}
              </Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-base"
                value={formData.companyName}
                onChangeText={(text) => handleInputChange('companyName', text)}
                placeholder={t('landlord.companyPlaceholder', 'Your company or business name')}
              />
            </View>
          </View>

          {/* Contact Fields */}
          <View className="bg-gray-50 rounded-xl p-4 mb-4">
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-lg bg-blue-600 items-center justify-center mr-3">
                <Phone size={20} color="white" />
              </View>
              <Text className="text-lg font-semibold text-gray-900">
                {t('landlord.contactInfo', 'Contact Information')}
              </Text>
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">
                {t('contact.phone', 'Phone Number')}
              </Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-base"
                value={formData.phone}
                onChangeText={(text) => handleInputChange('phone', text)}
                keyboardType="phone-pad"
                placeholder="+48 123 456 789"
              />
            </View>

            <View>
              <View className="flex-row items-center mb-2">
                <MapPin size={16} color={COLORS.gray[600]} />
                <Text className="text-gray-700 font-medium ml-1">
                  {t('contact.location', 'City / Location')}
                </Text>
              </View>
              <TextInput
                className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-base"
                value={formData.location}
                onChangeText={(text) => handleInputChange('location', text)}
                placeholder="e.g., Warsaw, Krakow"
              />
            </View>
          </View>

          {/* Bio */}
          <View className="bg-gray-50 rounded-xl p-4 mb-4">
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-lg bg-green-600 items-center justify-center mr-3">
                <FileText size={20} color="white" />
              </View>
              <Text className="text-lg font-semibold text-gray-900">
                {t('landlord.aboutYou', 'About You')}
              </Text>
            </View>

            <Text className="text-gray-700 font-medium mb-2">
              {t('landlord.bio', 'About You / Your Properties')}
            </Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-base"
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
        <View className="flex-row gap-3 p-4 border-t border-gray-100 bg-white">
          <Button variant="outline" className="flex-1" onPress={handleSkip}>
            <Text className="text-gray-700">{t('actions.skipForNow', 'Skip for now')}</Text>
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
