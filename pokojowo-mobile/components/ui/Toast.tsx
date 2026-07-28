import { View, Text, TouchableOpacity } from 'react-native';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import useTheme from '@/hooks/useTheme';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  type?: ToastType;
  title?: string;
  message: string;
  onDismiss?: () => void;
}

const accent: Record<ToastType, string> = {
  success: 'border-l-success',
  error: 'border-l-danger',
  warning: 'border-l-warning',
  info: 'border-l-info',
};

/**
 * Presentational toast card. The queue/animation host lives in
 * components/shared/ToastHost.tsx (see issue #89).
 */
export default function Toast({ type = 'info', title, message, onDismiss }: ToastProps) {
  const { colors } = useTheme();

  const iconColor = {
    success: colors.success,
    error: colors.danger,
    warning: colors.warning,
    info: colors.info,
  }[type];

  const Icon = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  }[type];

  return (
    <View
      className={cn(
        'flex-row items-start gap-3 rounded-xl border border-border border-l-4 bg-card p-4 shadow-sm shadow-black/10',
        accent[type]
      )}
    >
      <Icon size={20} color={iconColor} />
      <View className="flex-1">
        {title && <Text className="text-text font-semibold mb-0.5">{title}</Text>}
        <Text className="text-muted text-sm">{message}</Text>
      </View>
      {onDismiss && (
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={18} color={colors.muted} />
        </TouchableOpacity>
      )}
    </View>
  );
}
