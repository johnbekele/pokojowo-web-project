import { View, ActivityIndicator, Text } from 'react-native';
import { cn } from '@/lib/utils';
import useTheme from '@/hooks/useTheme';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

export default function LoadingSpinner({
  size = 'large',
  color,
  text,
  fullScreen = false,
  className,
}: LoadingSpinnerProps) {
  const { colors } = useTheme();
  const content = (
    <View className={cn('items-center justify-center', className)}>
      <ActivityIndicator size={size} color={color ?? colors.brand} />
      {text && <Text className="text-muted mt-3 text-center">{text}</Text>}
    </View>
  );

  if (fullScreen) {
    return <View className="flex-1 items-center justify-center bg-bg">{content}</View>;
  }

  return content;
}
