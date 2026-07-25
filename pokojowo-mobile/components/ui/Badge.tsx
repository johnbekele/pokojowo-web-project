import { View, Text } from 'react-native';
import { cn } from '@/lib/utils';

type BadgeVariant =
  | 'default'
  | 'brand'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Solid filled style vs. soft tinted style (default: soft). */
  solid?: boolean;
  className?: string;
}

const softStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: 'bg-surface', text: 'text-muted' },
  brand: { bg: 'bg-primary-100 dark:bg-primary-900', text: 'text-primary-700 dark:text-primary-200' },
  primary: { bg: 'bg-primary-100 dark:bg-primary-900', text: 'text-primary-700 dark:text-primary-200' },
  secondary: { bg: 'bg-secondary-100 dark:bg-secondary-900', text: 'text-secondary-700 dark:text-secondary-200' },
  success: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-200' },
  warning: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-700 dark:text-yellow-200' },
  danger: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-200' },
  info: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-200' },
};

const solidStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: 'bg-muted', text: 'text-white' },
  brand: { bg: 'bg-brand', text: 'text-brand-fg' },
  primary: { bg: 'bg-primary-600', text: 'text-white' },
  secondary: { bg: 'bg-secondary-600', text: 'text-white' },
  success: { bg: 'bg-success', text: 'text-white' },
  warning: { bg: 'bg-warning', text: 'text-white' },
  danger: { bg: 'bg-danger', text: 'text-white' },
  info: { bg: 'bg-info', text: 'text-white' },
};

const sizeStyles: Record<BadgeSize, { container: string; text: string }> = {
  sm: { container: 'px-2 py-0.5', text: 'text-xs' },
  md: { container: 'px-2.5 py-1', text: 'text-sm' },
};

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  solid = false,
  className,
}: BadgeProps) {
  const variantStyle = (solid ? solidStyles : softStyles)[variant];
  const sizeStyle = sizeStyles[size];

  return (
    <View className={cn('rounded-full self-start', variantStyle.bg, sizeStyle.container, className)}>
      <Text className={cn('font-medium', variantStyle.text, sizeStyle.text)}>{children}</Text>
    </View>
  );
}
