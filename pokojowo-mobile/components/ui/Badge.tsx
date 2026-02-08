import { View, Text } from 'react-native';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: 'bg-gray-100', text: 'text-gray-700' },
  primary: { bg: 'bg-primary-100', text: 'text-primary-700' },
  secondary: { bg: 'bg-secondary-100', text: 'text-secondary-700' },
  success: { bg: 'bg-green-100', text: 'text-green-700' },
  warning: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  danger: { bg: 'bg-red-100', text: 'text-red-700' },
};

const sizeStyles: Record<BadgeSize, { container: string; text: string }> = {
  sm: { container: 'px-2 py-0.5', text: 'text-xs' },
  md: { container: 'px-2.5 py-1', text: 'text-sm' },
};

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  className,
}: BadgeProps) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  return (
    <View
      className={cn('rounded-full', variantStyle.bg, sizeStyle.container, className)}
    >
      <Text className={cn('font-medium', variantStyle.text, sizeStyle.text)}>
        {children}
      </Text>
    </View>
  );
}
