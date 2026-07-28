import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { BadgeCheck } from 'lucide-react-native';
import { cn, getInitials } from '@/lib/utils';
import useTheme from '@/hooks/useTheme';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  source?: string | null;
  name?: string;
  size?: AvatarSize;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  verified?: boolean;
  className?: string;
}

const sizeStyles: Record<
  AvatarSize,
  { dim: number; container: string; text: string; badge: string; icon: number }
> = {
  xs: { dim: 24, container: 'w-6 h-6', text: 'text-xs', badge: 'w-2 h-2', icon: 12 },
  sm: { dim: 32, container: 'w-8 h-8', text: 'text-sm', badge: 'w-2.5 h-2.5', icon: 14 },
  md: { dim: 48, container: 'w-12 h-12', text: 'text-base', badge: 'w-3 h-3', icon: 16 },
  lg: { dim: 64, container: 'w-16 h-16', text: 'text-xl', badge: 'w-4 h-4', icon: 20 },
  xl: { dim: 96, container: 'w-24 h-24', text: 'text-3xl', badge: 'w-5 h-5', icon: 24 },
};

export default function Avatar({
  source,
  name = '',
  size = 'md',
  showOnlineStatus = false,
  isOnline = false,
  verified = false,
  className,
}: AvatarProps) {
  const { colors } = useTheme();
  const sizeStyle = sizeStyles[size];
  const initials = getInitials(name);

  return (
    <View className={cn('relative', className)}>
      {source ? (
        <Image
          source={{ uri: source }}
          style={{ width: sizeStyle.dim, height: sizeStyle.dim, borderRadius: 9999 }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View
          className={cn(
            'rounded-full bg-primary-100 dark:bg-primary-900 items-center justify-center',
            sizeStyle.container
          )}
        >
          <Text
            className={cn(
              'text-primary-700 dark:text-primary-200 font-bold',
              sizeStyle.text
            )}
          >
            {initials}
          </Text>
        </View>
      )}
      {verified && (
        <View className="absolute -bottom-0.5 -right-0.5 rounded-full bg-card">
          <BadgeCheck size={sizeStyle.icon} color={colors.brand} fill={colors.card} />
        </View>
      )}
      {showOnlineStatus && !verified && (
        <View
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-card',
            sizeStyle.badge,
            isOnline ? 'bg-success' : 'bg-muted'
          )}
        />
      )}
    </View>
  );
}
