import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Search, Building2, Users } from 'lucide-react-native';

import { Button } from '@/components/ui';
import useAuthStore from '@/stores/authStore';
import { useUpdateRole } from '@/hooks/auth/useAuth';
import { COLORS } from '@/lib/constants';

type Role = 'Tenant' | 'Landlord' | 'Both';

interface RoleOption {
  id: Role;
  icon: React.ComponentType<{ size: number; color: string }>;
  titleKey: string;
  descriptionKey: string;
}

const roleOptions: RoleOption[] = [
  {
    id: 'Tenant',
    icon: Search,
    titleKey: 'selectRole.tenant.title',
    descriptionKey: 'selectRole.tenant.description',
  },
  {
    id: 'Landlord',
    icon: Building2,
    titleKey: 'selectRole.landlord.title',
    descriptionKey: 'selectRole.landlord.description',
  },
  {
    id: 'Both',
    icon: Users,
    titleKey: 'selectRole.both.title',
    descriptionKey: 'selectRole.both.description',
  },
];

export default function OnboardingRoleScreen() {
  const { t } = useTranslation('auth');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const { user } = useAuthStore();
  const updateRoleMutation = useUpdateRole();

  const handleContinue = async () => {
    if (!selectedRole) return;

    try {
      const roles = selectedRole === 'Both' ? ['Tenant', 'Landlord'] : [selectedRole];
      await updateRoleMutation.mutateAsync(roles);
      router.replace('/(app)/(home)');
    } catch (error) {
      console.error('Failed to update role:', error);
      // Still navigate even if role update fails
      router.replace('/(app)/(home)');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-12">
        {/* Header */}
        <Text className="text-3xl font-bold text-gray-900 mb-2">
          {t('selectRole.title', 'How will you use Pokojowo?')}
        </Text>
        <Text className="text-gray-500 mb-8">
          {t('selectRole.subtitle', 'You can change this later in settings')}
        </Text>

        {/* Role options */}
        <View className="gap-4">
          {roleOptions.map((option) => {
            const IconComponent = option.icon;
            const isSelected = selectedRole === option.id;

            return (
              <TouchableOpacity
                key={option.id}
                onPress={() => setSelectedRole(option.id)}
                className={`flex-row items-center p-4 rounded-xl border-2 ${
                  isSelected
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <View
                  className={`w-14 h-14 rounded-full items-center justify-center ${
                    isSelected ? 'bg-primary-600' : 'bg-gray-100'
                  }`}
                >
                  <IconComponent
                    size={28}
                    color={isSelected ? 'white' : COLORS.gray[500]}
                  />
                </View>
                <View className="flex-1 ml-4">
                  <Text
                    className={`text-lg font-semibold ${
                      isSelected ? 'text-primary-600' : 'text-gray-900'
                    }`}
                  >
                    {t(option.titleKey, getDefaultTitle(option.id))}
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    {t(option.descriptionKey, getDefaultDescription(option.id))}
                  </Text>
                </View>
                <View
                  className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    isSelected
                      ? 'border-primary-600 bg-primary-600'
                      : 'border-gray-300'
                  }`}
                >
                  {isSelected && (
                    <View className="w-2 h-2 rounded-full bg-white" />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Continue button */}
      <View className="px-6 pb-4">
        <Button
          onPress={handleContinue}
          fullWidth
          disabled={!selectedRole}
          loading={updateRoleMutation.isPending}
        >
          {t('selectRole.continue', 'Continue')}
        </Button>
      </View>
    </SafeAreaView>
  );
}

function getDefaultTitle(id: Role): string {
  switch (id) {
    case 'Tenant':
      return "I'm looking for a room";
    case 'Landlord':
      return 'I have a room to rent';
    case 'Both':
      return 'Both';
    default:
      return '';
  }
}

function getDefaultDescription(id: Role): string {
  switch (id) {
    case 'Tenant':
      return 'Find your perfect flatmate and place to live';
    case 'Landlord':
      return 'List your property and find the ideal tenant';
    case 'Both':
      return "I'm looking for a room and also have one to rent";
    default:
      return '';
  }
}
