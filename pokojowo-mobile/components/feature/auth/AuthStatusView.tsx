import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, XCircle, AlertCircle, type LucideIcon } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import useTheme from '@/hooks/useTheme';

type StatusTone = 'success' | 'error' | 'warning';

const iconByTone: Record<StatusTone, LucideIcon> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
};

interface AuthStatusAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
}

interface AuthStatusViewProps {
  tone: StatusTone;
  title: string;
  message?: string;
  note?: string;
  primaryAction?: AuthStatusAction;
  secondaryAction?: AuthStatusAction;
}

/** Centered success/error/warning state used by auth flows. */
export default function AuthStatusView({
  tone,
  title,
  message,
  note,
  primaryAction,
  secondaryAction,
}: AuthStatusViewProps) {
  const { colors } = useTheme();
  const Icon = iconByTone[tone];
  const tint =
    tone === 'success' ? colors.success : tone === 'error' ? colors.danger : colors.warning;

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 items-center justify-center px-6">
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: `${tint}22` }}
        >
          <Icon size={44} color={tint} />
        </View>
        <Text className="text-2xl font-bold text-text text-center mb-2">{title}</Text>
        {message && <Text className="text-muted text-center mb-2">{message}</Text>}
        {note && <Text className="text-muted/70 text-center mb-6">{note}</Text>}
        <View className="w-full mt-4 gap-3">
          {primaryAction && (
            <Button variant={primaryAction.variant ?? 'primary'} fullWidth onPress={primaryAction.onPress}>
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant={secondaryAction.variant ?? 'outline'} fullWidth onPress={secondaryAction.onPress}>
              {secondaryAction.label}
            </Button>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
