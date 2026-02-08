import { View, ActivityIndicator, Text } from 'react-native';
import { cn } from '@/lib/utils';
import { COLORS } from '@/lib/constants';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

export default function LoadingSpinner({
  size = 'large',
  color = COLORS.primary[600],
  text,
  fullScreen = false,
  className,
}: LoadingSpinnerProps) {
  const content = (
    <View className={cn('items-center justify-center', className)}>
      <ActivityIndicator size={size} color={color} />
      {text && (
        <Text className="text-gray-500 mt-3 text-center">{text}</Text>
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        {content}
      </View>
    );
  }

  return content;
}
