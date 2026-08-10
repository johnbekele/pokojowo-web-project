import { View, Text, ScrollView, TouchableOpacity, Switch, Linking } from 'react-native';
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
  Sun,
  Moon,
  Smartphone,
  Check,
  Fingerprint,
} from 'lucide-react-native';

import useAuthStore from '@/stores/authStore';
import useUIStore, { type ThemeMode } from '@/stores/uiStore';
import { useDeleteAccount, useUpdateProfile } from '@/hooks/user/useUser';
import useTheme from '@/hooks/useTheme';
import useBiometricSetting from '@/hooks/useBiometricSetting';
import i18n, { changeLanguage } from '@/lib/i18n';
import { PUBLIC_SITE_URL } from '@/lib/constants';
import { pushNotificationsEnabled } from '@/lib/pushPreferences';
import {
  normalizeNotificationPreferences,
  toNotificationPreferencesPayload,
} from '@/types/user.types';

const PRIVACY_URL = `${PUBLIC_SITE_URL}/privacy`;
const TERMS_URL = `${PUBLIC_SITE_URL}/terms`;
const HELP_URL = `${PUBLIC_SITE_URL}/help`;

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

function SettingItem({ icon, title, subtitle, onPress, rightElement, danger }: SettingItemProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center py-4 px-4"
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View
        className={`w-10 h-10 rounded-full items-center justify-center ${
          danger ? 'bg-danger/10' : 'bg-surface'
        }`}
      >
        {icon}
      </View>
      <View className="flex-1 ml-3">
        <Text className={`text-base ${danger ? 'text-danger' : 'text-text'}`}>{title}</Text>
        {subtitle && <Text className="text-sm text-muted">{subtitle}</Text>}
      </View>
      {rightElement || (onPress && <ChevronRight size={20} color={colors.muted} />)}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation(['profile', 'common']);
  const router = useRouter();
  const { colors } = useTheme();
  const { user, logout, updateUser } = useAuthStore();
  const { mutate: deleteAccount } = useDeleteAccount();
  const { mutate: updateProfile } = useUpdateProfile();

  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const confirm = useUIStore((s) => s.confirm);
  const showToast = useUIStore((s) => s.showToast);

  const biometric = useBiometricSetting();

  const handleToggleBiometric = async (value: boolean) => {
    const ok = await biometric.toggle(value, t('settings.biometricConfirm', 'Confirm biometric unlock'));
    if (!ok && value) {
      showToast({
        type: 'error',
        message: t('settings.biometricError', 'Could not verify biometrics'),
      });
    }
  };

  const currentLanguage = i18n.language;

  const prefs = user?.notification_preferences;
  const pushEnabled = pushNotificationsEnabled(prefs);

  const handleTogglePush = (value: boolean) => {
    const next = toNotificationPreferencesPayload({
      ...prefs,
      push: {
        ...prefs?.push,
        new_messages: value,
        property_updates: value,
        match_notifications: value,
      },
    });
    const previous = prefs;
    // Optimistic update; persist via PUT /users/me.
    updateUser({ notification_preferences: normalizeNotificationPreferences(next) });
    updateProfile(
      { notificationPreferences: next },
      {
        onError: () => {
          updateUser({ notification_preferences: previous });
          showToast({ type: 'error', message: t('settings.saveError', 'Failed to save settings') });
        },
      }
    );
  };

  const handleLanguageChange = async () => {
    const nextLang = currentLanguage === 'pl' ? 'en' : 'pl';
    await changeLanguage(nextLang);
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() =>
      showToast({ type: 'error', message: t('settings.linkError', 'Unable to open link') })
    );
  };

  const themeOptions: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'light', label: t('settings.themeLight', 'Light'), icon: <Sun size={18} color={colors.text} /> },
    { mode: 'dark', label: t('settings.themeDark', 'Dark'), icon: <Moon size={18} color={colors.text} /> },
    { mode: 'system', label: t('settings.themeSystem', 'System'), icon: <Smartphone size={18} color={colors.text} /> },
  ];

  const handleDeleteAccount = async () => {
    const ok = await confirm({
      title: t('settings.deleteAccount', 'Delete Account'),
      message: t(
        'settings.deleteConfirm',
        'Are you sure you want to delete your account? This action cannot be undone.'
      ),
      confirmLabel: t('common:actions.delete', 'Delete'),
      destructive: true,
    });
    if (!ok) return;
    deleteAccount(undefined, {
      onSuccess: async () => {
        await logout();
        router.replace('/(auth)/login');
      },
      onError: () => {
        showToast({ type: 'error', message: t('settings.deleteError', 'Failed to delete account') });
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-text">{t('settings.title', 'Settings')}</Text>
      </View>

      <ScrollView className="flex-1">
        {/* Appearance */}
        <View className="mt-4">
          <Text className="px-4 mb-2 text-sm font-semibold text-muted uppercase">
            {t('settings.appearance', 'Appearance')}
          </Text>
          <View className="px-4">
            {themeOptions.map((opt) => (
              <TouchableOpacity
                key={opt.mode}
                onPress={() => setTheme(opt.mode)}
                className="flex-row items-center py-3"
                activeOpacity={0.7}
              >
                <View className="w-10 h-10 rounded-full bg-surface items-center justify-center">
                  {opt.icon}
                </View>
                <Text className="flex-1 ml-3 text-base text-text">{opt.label}</Text>
                {theme === opt.mode && <Check size={20} color={colors.brand} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* General */}
        <View className="mt-6">
          <Text className="px-4 mb-2 text-sm font-semibold text-muted uppercase">
            {t('settings.general', 'General')}
          </Text>
          <SettingItem
            icon={<Globe size={20} color={colors.muted} />}
            title={t('settings.language', 'Language')}
            subtitle={currentLanguage === 'pl' ? 'Polski' : 'English'}
            onPress={handleLanguageChange}
          />
          <View className="h-px bg-border ml-16" />
          <SettingItem
            icon={<Bell size={20} color={colors.muted} />}
            title={t('settings.notifications', 'Push Notifications')}
            subtitle={t('settings.notificationsSubtitle', 'Matches, messages and listing interest')}
            rightElement={
              <Switch
                value={pushEnabled}
                onValueChange={handleTogglePush}
                trackColor={{ false: colors.border, true: colors.brand }}
              />
            }
          />
        </View>

        {/* Security */}
        {biometric.available && (
          <View className="mt-6">
            <Text className="px-4 mb-2 text-sm font-semibold text-muted uppercase">
              {t('settings.security', 'Security')}
            </Text>
            <SettingItem
              icon={<Fingerprint size={20} color={colors.muted} />}
              title={t('settings.biometric', 'Biometric unlock')}
              subtitle={t('settings.biometricSubtitle', 'Require Face ID / fingerprint to open the app')}
              rightElement={
                <Switch
                  value={biometric.enabled}
                  onValueChange={handleToggleBiometric}
                  trackColor={{ false: colors.border, true: colors.brand }}
                />
              }
            />
          </View>
        )}

        {/* Privacy */}
        <View className="mt-6">
          <Text className="px-4 mb-2 text-sm font-semibold text-muted uppercase">
            {t('settings.privacy', 'Privacy')}
          </Text>
          <SettingItem
            icon={<Shield size={20} color={colors.muted} />}
            title={t('settings.privacyPolicy', 'Privacy Policy')}
            onPress={() => openLink(PRIVACY_URL)}
          />
          <View className="h-px bg-border ml-16" />
          <SettingItem
            icon={<FileText size={20} color={colors.muted} />}
            title={t('settings.terms', 'Terms of Service')}
            onPress={() => openLink(TERMS_URL)}
          />
        </View>

        {/* Support */}
        <View className="mt-6">
          <Text className="px-4 mb-2 text-sm font-semibold text-muted uppercase">
            {t('settings.support', 'Support')}
          </Text>
          <SettingItem
            icon={<CircleHelp size={20} color={colors.muted} />}
            title={t('settings.help', 'Help Center')}
            onPress={() => openLink(HELP_URL)}
          />
        </View>

        {/* Danger Zone */}
        <View className="mt-6 mb-8">
          <Text className="px-4 mb-2 text-sm font-semibold text-muted uppercase">
            {t('settings.dangerZone', 'Danger Zone')}
          </Text>
          <SettingItem
            icon={<Trash2 size={20} color={colors.danger} />}
            title={t('settings.deleteAccount', 'Delete Account')}
            onPress={handleDeleteAccount}
            danger
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
