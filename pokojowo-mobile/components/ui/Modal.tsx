import { Modal as RNModal, View, TouchableOpacity, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import useTheme from '@/hooks/useTheme';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  showCloseButton?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  full: 'w-full h-full',
};

export default function Modal({
  visible,
  onClose,
  children,
  title,
  showCloseButton = true,
  size = 'md',
  className,
}: ModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isFull = size === 'full';
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        className={cn(
          'flex-1 bg-black/50',
          // A full-size sheet owns the whole screen, so centring it inside
          // padding would leave its content with no room to lay out.
          isFull ? '' : 'justify-center items-center p-4'
        )}
        onPress={onClose}
      >
        <Pressable
          className={cn(
            'bg-card rounded-2xl w-full overflow-hidden',
            sizeStyles[size],
            isFull && 'rounded-none flex-1',
            className
          )}
          // statusBarTranslucent means a full sheet draws under the notch/home bar.
          style={isFull ? { paddingTop: insets.top, paddingBottom: insets.bottom } : undefined}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <View className="flex-row items-center justify-between p-4 border-b border-border">
              <Text className="text-lg font-semibold text-text flex-1">
                {title}
              </Text>
              {showCloseButton && (
                <TouchableOpacity
                  onPress={onClose}
                  className="p-1 -mr-1 rounded-full"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={24} color={colors.muted} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Content */}
          <View className={cn(isFull ? 'flex-1' : 'p-4')}>{children}</View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
