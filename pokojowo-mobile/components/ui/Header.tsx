import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import useTheme from '@/hooks/useTheme';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  /** Rendered on the right (e.g. notification bell, actions). */
  right?: React.ReactNode;
  /** Rendered below the title row (e.g. a search bar). */
  children?: React.ReactNode;
  /** Apply the top safe-area inset as padding (default true). */
  safeArea?: boolean;
  className?: string;
}

export default function Header({
  title,
  subtitle,
  showBack = false,
  onBack,
  right,
  children,
  safeArea = true,
  className,
}: HeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();

  const handleBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
  };

  return (
    <View
      className={cn('bg-bg border-b border-border px-4 pb-3', className)}
      style={{ paddingTop: (safeArea ? insets.top : 0) + 8 }}
    >
      <View className="flex-row items-center min-h-[36px]">
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            className="-ml-2 mr-1 p-1 rounded-full"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={26} color={colors.text} />
          </TouchableOpacity>
        )}
        <View className="flex-1">
          {title && (
            <Text className="text-xl font-bold text-text" numberOfLines={1}>
              {title}
            </Text>
          )}
          {subtitle && (
            <Text className="text-sm text-muted" numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        {right && <View className="ml-2">{right}</View>}
      </View>
      {children ? <View className="mt-3">{children}</View> : null}
    </View>
  );
}
