import { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import useTheme from '@/hooks/useTheme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export default function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  containerClassName,
  className,
  secureTextEntry,
  ...props
}: InputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const isPassword = !!secureTextEntry;
  const hideText = isPassword && !revealed;

  const borderClass = error
    ? 'border-danger'
    : focused
      ? 'border-brand'
      : 'border-border';

  return (
    <View className={cn('mb-4', containerClassName)}>
      {label && <Text className="text-text mb-2 font-medium">{label}</Text>}
      <View className="relative">
        {leftIcon && (
          <View className="absolute left-3 top-0 bottom-0 justify-center z-10">
            {leftIcon}
          </View>
        )}
        <TextInput
          className={cn(
            'border rounded-lg px-4 py-3 text-base text-text bg-card',
            borderClass,
            leftIcon && 'pl-10',
            (rightIcon || isPassword) && 'pr-10',
            className
          )}
          placeholderTextColor={colors.muted}
          secureTextEntry={hideText}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        {isPassword ? (
          <TouchableOpacity
            className="absolute right-3 top-0 bottom-0 justify-center z-10"
            onPress={() => setRevealed((v) => !v)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {revealed ? (
              <EyeOff size={20} color={colors.muted} />
            ) : (
              <Eye size={20} color={colors.muted} />
            )}
          </TouchableOpacity>
        ) : (
          rightIcon && (
            <View className="absolute right-3 top-0 bottom-0 justify-center z-10">
              {rightIcon}
            </View>
          )
        )}
      </View>
      {error && <Text className="text-danger text-sm mt-1">{error}</Text>}
      {hint && !error && <Text className="text-muted text-sm mt-1">{hint}</Text>}
    </View>
  );
}
