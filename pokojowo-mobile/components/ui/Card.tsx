import { View, TouchableOpacity, type ViewStyle, type StyleProp } from 'react-native';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const paddingStyles = {
  none: '',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
};

const variantStyles = {
  default: 'bg-white',
  outlined: 'bg-white border border-gray-200',
  elevated: 'bg-white shadow-sm',
};

export default function Card({
  children,
  onPress,
  variant = 'default',
  padding = 'md',
  className,
  ...props
}: CardProps) {
  const baseClassName = cn(
    'rounded-xl overflow-hidden',
    variantStyles[variant],
    paddingStyles[padding],
    className
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        className={baseClassName}
        activeOpacity={0.7}
        {...props}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View className={baseClassName} {...props}>
      {children}
    </View>
  );
}

// Card subcomponents
Card.Header = function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <View className={cn('mb-3', className)}>{children}</View>;
};

Card.Content = function CardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <View className={cn('', className)}>{children}</View>;
};

Card.Footer = function CardFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <View className={cn('mt-3 pt-3 border-t border-gray-100', className)}>{children}</View>;
};
