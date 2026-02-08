import { View, Text, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Globe,
  Bell,
  Shield,
  CircleHelp,
  FileText,
  ChevronRight,
  Trash2,
} from 'lucide-react-native';

import { Button } from '@/components/ui';
import useAuthStore from '@/stores/authStore';
import { useDeleteAccount } from '@/hooks/user/useUser';
import i18n from '@/lib/i18n';
import { COLORS } from '@/lib/constants';

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

function SettingItem({
  icon,
  title,
  subtitle,
  onPress,
  rightElement,
  danger,
}: SettingItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center py-4 px-4"
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View
        className={`w-10 h-10 rounded-full items-center justify-center ${
          danger ? 'bg-red-100' : 'bg-gray-100'
        }`}
      >
        {icon}
      </View>
      <View className="flex-1 ml-3">
        <Text className={`text-base ${danger ? 'text-red-600' : 'text-gray-900'}`}>
          {title}
        </Text>
        {subtitle && <Text className="text-sm text-gray-500">{subtitle}</Text>}
      </View>
      {rightElement || (onPress && <ChevronRight size={20} color={COLORS.gray[400]} />)}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation(['profile', 'common']);
  const router = useRouter();
  const { logout } = useAuthStore();
  const { mutate: deleteAccount, isPending: isDeleting } = useDeleteAccount();

  const currentLanguage = i18n.language;

  const handleLanguageChange = () => {
    Alert.alert(
      t('settings.language', 'Language'),
      t('settings.selectLanguage', 'Select your preferred language'),
      [
        {
          text: 'English',
          onPress: () => i18n.changeLanguage('en'),
        },
        {
          text: 'Polski',
          onPress: () => i18n.changeLanguage('pl'),
        },
        { text: t('common:actions.cancel', 'Cancel'), style: 'cancel' },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('settings.deleteAccount', 'Delete Account'),
      t(
        'settings.deleteConfirm',
        'Are you sure you want to delete your account? This action cannot be undone.'
      ),
      [
        { text: t('common:actions.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common:actions.delete', 'Delete'),
          style: 'destructive',
          onPress: () => {
            deleteAccount(undefined, {
              onSuccess: async () => {
                await logout();
                router.replace('/(auth)/login');
              },
              onError: () => {
                Alert.alert(
                  t('settings.error', 'Error'),
                  t('settings.deleteError', 'Failed to delete account')
                );
              },
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ArrowLeft size={24} color={COLORS.gray[700]} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">
          {t('settings.title', 'Settings')}
        </Text>
      </View>

      <ScrollView className="flex-1">
        {/* General */}
        <View className="mt-4">
          <Text className="px-4 mb-2 text-sm font-semibold text-gray-500 uppercase">
            {t('settings.general', 'General')}
          </Text>
          <View className="bg-white">
            <SettingItem
              icon={<Globe size={20} color={COLORS.gray[600]} />}
              title={t('settings.language', 'Language')}
              subtitle={currentLanguage === 'pl' ? 'Polski' : 'English'}
              onPress={handleLanguageChange}
            />
            <View className="h-px bg-gray-100 ml-16" />
            <SettingItem
              icon={<Bell size={20} color={COLORS.gray[600]} />}
              title={t('settings.notifications', 'Notifications')}
              rightElement={
                <Switch
                  value={true}
                  onValueChange={() => {}}
                  trackColor={{ false: COLORS.gray[300], true: COLORS.primary[600] }}
                />
              }
            />
          </View>
        </View>

        {/* Privacy */}
        <View className="mt-6">
          <Text className="px-4 mb-2 text-sm font-semibold text-gray-500 uppercase">
            {t('settings.privacy', 'Privacy')}
          </Text>
          <View className="bg-white">
            <SettingItem
              icon={<Shield size={20} color={COLORS.gray[600]} />}
              title={t('settings.privacyPolicy', 'Privacy Policy')}
              onPress={() => {}}
            />
            <View className="h-px bg-gray-100 ml-16" />
            <SettingItem
              icon={<FileText size={20} color={COLORS.gray[600]} />}
              title={t('settings.terms', 'Terms of Service')}
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Support */}
        <View className="mt-6">
          <Text className="px-4 mb-2 text-sm font-semibold text-gray-500 uppercase">
            {t('settings.support', 'Support')}
          </Text>
          <View className="bg-white">
            <SettingItem
              icon={<CircleHelp size={20} color={COLORS.gray[600]} />}
              title={t('settings.help', 'Help Center')}
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Danger Zone */}
        <View className="mt-6 mb-8">
          <Text className="px-4 mb-2 text-sm font-semibold text-gray-500 uppercase">
            {t('settings.dangerZone', 'Danger Zone')}
          </Text>
          <View className="bg-white">
            <SettingItem
              icon={<Trash2 size={20} color={COLORS.error} />}
              title={t('settings.deleteAccount', 'Delete Account')}
              onPress={handleDeleteAccount}
              danger
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
