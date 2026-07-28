import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { cn } from '@/lib/utils';
import useTheme from '@/hooks/useTheme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  /** Deprecated alias for leftIcon (kept for back-compat). */
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
}

const variantStyles: Record<ButtonVariant, { container: string; text: string }> = {
  primary: {
    container: 'bg-brand active:opacity-80',
    text: 'text-brand-fg',
  },
  secondary: {
    container: 'bg-surface border border-border active:opacity-70',
    text: 'text-text',
  },
  outline: {
    container: 'border border-border bg-transparent active:bg-surface',
    text: 'text-text',
  },
  ghost: {
    container: 'bg-transparent active:bg-surface',
    text: 'text-text',
  },
  danger: {
    container: 'bg-danger active:opacity-80',
    text: 'text-white',
  },
};

const sizeStyles: Record<ButtonSize, { container: string; text: string }> = {
  sm: { container: 'px-3 py-2 min-h-[36px]', text: 'text-sm' },
  md: { container: 'px-4 py-3 min-h-[44px]', text: 'text-base' },
  lg: { container: 'px-6 py-4 min-h-[52px]', text: 'text-lg' },
};

export default function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
}: ButtonProps) {
  const { colors } = useTheme();
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  const resolvedLeftIcon = leftIcon ?? (iconPosition === 'left' ? icon : undefined);
  const resolvedRightIcon = rightIcon ?? (iconPosition === 'right' ? icon : undefined);

  const spinnerColor =
    variant === 'primary'
      ? colors.brandFg
      : variant === 'danger'
        ? '#ffffff'
        : colors.text;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={cn(
        'rounded-lg flex-row items-center justify-center',
        variantStyle.container,
        sizeStyle.container,
        fullWidth && 'w-full',
        (disabled || loading) && 'opacity-50',
        className
      )}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} size="small" />
      ) : (
        <View className="flex-row items-center gap-2">
          {resolvedLeftIcon}
          <Text className={cn('font-semibold', variantStyle.text, sizeStyle.text)}>
            {children}
          </Text>
          {resolvedRightIcon}
        </View>
      )}
    </TouchableOpacity>
  );
}
