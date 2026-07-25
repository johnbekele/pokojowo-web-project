import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Search, Building2, Users } from 'lucide-react-native';

import { Button } from '@/components/ui';
import useAuthStore from '@/stores/authStore';
import { useUpdateRole } from '@/hooks/auth/useAuth';
import useTheme from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

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
  const { colors } = useTheme();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const { user } = useAuthStore();
  const updateRoleMutation = useUpdateRole();

  const handleContinue = async () => {
    if (!selectedRole) return;

    try {
      const roles = selectedRole === 'Both' ? ['Tenant', 'Landlord'] : [selectedRole];
      await updateRoleMutation.mutateAsync(roles);

      // Navigate to appropriate profile completion page
      if (selectedRole === 'Landlord') {
        router.replace('/onboarding/profile-completion/landlord');
      } else {
        // For Tenant or Both, start with tenant profile completion
        router.replace('/onboarding/profile-completion/tenant');
      }
    } catch (error) {
      console.error('Failed to update role:', error);
      // Still navigate even if role update fails
      if (selectedRole === 'Landlord') {
        router.replace('/onboarding/profile-completion/landlord');
      } else {
        router.replace('/onboarding/profile-completion/tenant');
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 px-6 pt-12">
        {/* Header */}
        <Text className="text-3xl font-bold text-text mb-2">
          {t('selectRole.title', 'How will you use Pokojowo?')}
        </Text>
        <Text className="text-muted mb-8">
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
                className={cn(
                  'flex-row items-center p-4 rounded-xl border-2',
                  isSelected ? 'border-brand bg-primary-50 dark:bg-primary-900' : 'border-border bg-card'
                )}
              >
                <View
                  className={cn(
                    'w-14 h-14 rounded-full items-center justify-center',
                    isSelected ? 'bg-brand' : 'bg-surface'
                  )}
                >
                  <IconComponent size={28} color={isSelected ? colors.brandFg : colors.muted} />
                </View>
                <View className="flex-1 ml-4">
                  <Text
                    className={cn('text-lg font-semibold', isSelected ? 'text-brand' : 'text-text')}
                  >
                    {t(option.titleKey, getDefaultTitle(option.id))}
                  </Text>
                  <Text className="text-muted text-sm">
                    {t(option.descriptionKey, getDefaultDescription(option.id))}
                  </Text>
                </View>
                <View
                  className={cn(
                    'w-6 h-6 rounded-full border-2 items-center justify-center',
                    isSelected ? 'border-brand bg-brand' : 'border-border'
                  )}
                >
                  {isSelected && <View className="w-2 h-2 rounded-full bg-white" />}
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
