import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useSegments, type Href } from 'expo-router';
import { Home, Users, MessageSquare, User, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import useTheme from '@/hooks/useTheme';
import useTabBadges from '@/hooks/useTabBadges';

interface TabDef {
  key: string;
  group: string;
  href: Href;
  icon: LucideIcon;
  labelKey: string;
}

const TABS: TabDef[] = [
  { key: 'home', group: '(home)', href: '/(app)/(home)', icon: Home, labelKey: 'tabs.home' },
  { key: 'matches', group: '(matches)', href: '/(app)/(matches)', icon: Users, labelKey: 'tabs.flatmates' },
  { key: 'chat', group: '(chat)', href: '/(app)/(chat)', icon: MessageSquare, labelKey: 'tabs.chat' },
  { key: 'profile', group: '(profile)', href: '/(app)/(profile)', icon: User, labelKey: 'tabs.profile' },
];

function CountBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <View className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-danger items-center justify-center">
      <Text className="text-white text-[10px] font-bold">{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

export default function TabBar() {
  const router = useRouter();
  const segments = useSegments();
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const { chatUnread, notificationUnread } = useTabBadges();

  const activeGroup =
    TABS.find((tab) => (segments as string[]).includes(tab.group))?.key ?? 'home';

  const badgeFor = (key: string) =>
    key === 'chat' ? chatUnread : key === 'profile' ? notificationUnread : 0;

  return (
    <SafeAreaView edges={['bottom']} className="bg-bg">
      <View className="flex-row border-t border-border bg-bg py-2">
        {TABS.map((tab) => {
          const isActive = tab.key === activeGroup;
          const color = isActive ? colors.brand : colors.muted;
          const Icon = tab.icon;
          return (
            <TouchableOpacity
              key={tab.key}
              className="flex-1 items-center py-2"
              onPress={() => router.navigate(tab.href)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <View>
                <Icon color={color} size={24} />
                <CountBadge count={badgeFor(tab.key)} />
              </View>
              <Text
                className={cn('text-xs mt-1', isActive ? 'text-brand font-semibold' : 'text-muted')}
              >
                {t(tab.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
