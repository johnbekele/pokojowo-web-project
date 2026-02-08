import { View, Image, Text } from 'react-native';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  source?: string | null;
  name?: string;
  size?: AvatarSize;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  className?: string;
}

const sizeStyles: Record<AvatarSize, { container: string; text: string; badge: string }> = {
  xs: { container: 'w-6 h-6', text: 'text-xs', badge: 'w-2 h-2' },
  sm: { container: 'w-8 h-8', text: 'text-sm', badge: 'w-2.5 h-2.5' },
  md: { container: 'w-12 h-12', text: 'text-base', badge: 'w-3 h-3' },
  lg: { container: 'w-16 h-16', text: 'text-xl', badge: 'w-4 h-4' },
  xl: { container: 'w-24 h-24', text: 'text-3xl', badge: 'w-5 h-5' },
};

export default function Avatar({
  source,
  name = '',
  size = 'md',
  showOnlineStatus = false,
  isOnline = false,
  className,
}: AvatarProps) {
  const sizeStyle = sizeStyles[size];
  const initials = getInitials(name);

  return (
    <View className={cn('relative', className)}>
      {source ? (
        <Image
          source={{ uri: source }}
          className={cn('rounded-full', sizeStyle.container)}
          resizeMode="cover"
        />
      ) : (
        <View
          className={cn(
            'rounded-full bg-primary-100 items-center justify-center',
            sizeStyle.container
          )}
        >
          <Text className={cn('text-primary-600 font-bold', sizeStyle.text)}>
            {initials}
          </Text>
        </View>
      )}
      {showOnlineStatus && (
        <View
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-white',
            sizeStyle.badge,
            isOnline ? 'bg-green-500' : 'bg-gray-400'
          )}
        />
      )}
    </View>
  );
}
