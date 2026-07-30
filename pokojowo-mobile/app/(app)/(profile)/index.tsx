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
  Users,
  Phone,
  ShieldCheck,
} from 'lucide-react-native';

import { Avatar, Badge } from '@/components/ui';
import useAuthStore from '@/stores/authStore';
import useUIStore from '@/stores/uiStore';
import useTheme from '@/hooks/useTheme';
import { getImageUrl } from '@/lib/image';

export default function ProfileScreen() {
  const { t } = useTranslation('profile');
  const { user, logout } = useAuthStore();
  const { colors } = useTheme();
  const confirm = useUIStore((s) => s.confirm);

  const handleLogout = async () => {
    const ok = await confirm({
      title: t('menu.logout', 'Log Out'),
      message: t('logoutConfirm', 'Are you sure you want to log out?'),
      confirmLabel: t('menu.logout', 'Log Out'),
      destructive: true,
    });
    if (!ok) return;
    await logout();
    router.replace('/(auth)/login');
  };

  const isLandlord = user?.role?.includes('Landlord');
  const photoUrl = user?.photo ? getImageUrl(user.photo) : null;
  const displayName =
    [user?.firstname, user?.lastname].filter(Boolean).join(' ') ||
    user?.username ||
    user?.email ||
    'User';

  const trustLabel =
    user?.trustLevel === 'id_verified'
      ? t('trust.idVerified', 'ID Verified')
      : user?.trustLevel === 'verified'
        ? t('trust.verified', 'Verified')
        : null;

  const menuItems = [
    { icon: User, label: t('menu.editProfile', 'Edit Profile'), href: '/(app)/(profile)/edit' },
    { icon: Phone, label: t('menu.verifyPhone', 'Verify phone'), href: '/(app)/(profile)/verify-phone' },
    ...(isLandlord
      ? [
          { icon: Building2, label: t('menu.landlordDashboard', 'Landlord Dashboard'), href: '/(app)/(landlord)/dashboard' },
          { icon: ShieldCheck, label: t('menu.landlordVerification', 'Landlord verification'), href: '/(app)/(landlord)/verification' },
        ]
      : []),
    { icon: Users, label: t('menu.likesMatches', 'Likes & Matches'), href: '/(app)/(profile)/likes' },
    { icon: Heart, label: t('menu.favorites', 'Saved Matches'), href: '/(app)/(profile)/favorites' },
    { icon: Globe, label: t('menu.language', 'Language'), href: '/(app)/(profile)/settings' },
    { icon: Settings, label: t('menu.settings', 'Settings'), href: '/(app)/(profile)/settings' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView>
        {/* Header */}
        <View className="px-4 py-3 border-b border-border">
          <Text className="text-2xl font-bold text-text">{t('title', 'Profile')}</Text>
        </View>

        {/* User info */}
        <View className="items-center py-8 px-4">
          <Avatar
            source={photoUrl}
            name={displayName}
            size="xl"
            verified={!!trustLabel}
          />
          <Text className="text-xl font-semibold text-text mt-4">{displayName}</Text>
          <Text className="text-muted mt-1">{user?.email}</Text>

          <View className="flex-row flex-wrap items-center justify-center gap-2 mt-3">
            {user?.role && user.role.length > 0 && (
              <Badge variant="primary" size="sm">
                {Array.isArray(user.role) ? user.role.join(', ') : user.role}
              </Badge>
            )}
            {trustLabel && (
              <Badge variant="success" size="sm">
                {trustLabel}
              </Badge>
            )}
            {typeof user?.trustScore === 'number' && (
              <Badge variant="default" size="sm">
                {t('trust.score', 'Trust {{score}}', { score: Math.round(user.trustScore) })}
              </Badge>
            )}
          </View>
        </View>

        {/* Menu items */}
        <View className="px-4">
          {menuItems.map((item, index) => (
            <Link key={index} href={item.href as never} asChild>
              <TouchableOpacity className="flex-row items-center py-4 border-b border-border">
                <View className="w-10 h-10 rounded-full bg-surface items-center justify-center">
                  <item.icon size={20} color={colors.muted} />
                </View>
                <Text className="flex-1 ml-4 text-base text-text">{item.label}</Text>
                <ChevronRight size={20} color={colors.muted} />
              </TouchableOpacity>
            </Link>
          ))}

          {/* Logout */}
          <TouchableOpacity className="flex-row items-center py-4" onPress={handleLogout}>
            <View className="w-10 h-10 rounded-full bg-danger/10 items-center justify-center">
              <LogOut size={20} color={colors.danger} />
            </View>
            <Text className="flex-1 ml-4 text-base text-danger">{t('menu.logout', 'Log Out')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
