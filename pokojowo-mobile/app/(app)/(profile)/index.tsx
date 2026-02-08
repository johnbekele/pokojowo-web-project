import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Settings,
  Heart,
  LogOut,
  ChevronRight,
  User,
  Globe,
  Building2,
} from 'lucide-react-native';

import useAuthStore from '@/stores/authStore';
import { COLORS } from '@/lib/constants';
import { getInitials } from '@/lib/utils';

export default function ProfileScreen() {
  const { t } = useTranslation('profile');
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const isLandlord = user?.role?.includes('Landlord');

  const menuItems = [
    {
      icon: User,
      label: t('menu.editProfile', 'Edit Profile'),
      href: '/(app)/(profile)/edit',
    },
    ...(isLandlord
      ? [
          {
            icon: Building2,
            label: t('menu.landlordDashboard', 'Landlord Dashboard'),
            href: '/(app)/(landlord)/dashboard',
          },
        ]
      : []),
    {
      icon: Heart,
      label: t('menu.favorites', 'Saved Matches'),
      href: '/(app)/(profile)/favorites',
    },
    {
      icon: Globe,
      label: t('menu.language', 'Language'),
      href: '/(app)/(profile)/settings',
    },
    {
      icon: Settings,
      label: t('menu.settings', 'Settings'),
      href: '/(app)/(profile)/settings',
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView>
        {/* Header */}
        <View className="px-4 py-3 border-b border-gray-100">
          <Text className="text-2xl font-bold text-gray-900">
            {t('title', 'Profile')}
          </Text>
        </View>

        {/* User info */}
        <View className="items-center py-8 px-4">
          <View className="w-24 h-24 rounded-full bg-primary-100 items-center justify-center mb-4">
            {user?.photo ? (
              <Text className="text-primary-600 text-2xl">Photo</Text>
            ) : (
              <Text className="text-primary-600 text-3xl font-bold">
                {getInitials(user?.username || user?.email || 'U')}
              </Text>
            )}
          </View>
          <Text className="text-xl font-semibold text-gray-900">
            {user?.username || user?.email}
          </Text>
          <Text className="text-gray-500 mt-1">{user?.email}</Text>
          {user?.role && user.role.length > 0 && (
            <View className="bg-primary-100 px-3 py-1 rounded-full mt-2">
              <Text className="text-primary-700 text-sm font-medium">
                {Array.isArray(user.role) ? user.role.join(', ') : user.role}
              </Text>
            </View>
          )}
        </View>

        {/* Menu items */}
        <View className="px-4">
          {menuItems.map((item, index) => (
            <Link key={index} href={item.href as any} asChild>
              <TouchableOpacity className="flex-row items-center py-4 border-b border-gray-100">
                <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
                  <item.icon size={20} color={COLORS.gray[600]} />
                </View>
                <Text className="flex-1 ml-4 text-base text-gray-900">
                  {item.label}
                </Text>
                <ChevronRight size={20} color={COLORS.gray[400]} />
              </TouchableOpacity>
            </Link>
          ))}

          {/* Logout */}
          <TouchableOpacity
            className="flex-row items-center py-4"
            onPress={handleLogout}
          >
            <View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center">
              <LogOut size={20} color={COLORS.error} />
            </View>
            <Text className="flex-1 ml-4 text-base text-red-600">
              {t('menu.logout', 'Log Out')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
