import { Modal as RNModal, View, TouchableOpacity, Text, Pressable } from 'react-native';
import { X } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import { COLORS } from '@/lib/constants';

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
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        className="flex-1 bg-black/50 justify-center items-center p-4"
        onPress={onClose}
      >
        <Pressable
          className={cn(
            'bg-white rounded-2xl w-full overflow-hidden',
            sizeStyles[size],
            size === 'full' && 'rounded-none',
            className
          )}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
              <Text className="text-lg font-semibold text-gray-900 flex-1">
                {title}
              </Text>
              {showCloseButton && (
                <TouchableOpacity
                  onPress={onClose}
                  className="p-1 -mr-1 rounded-full"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={24} color={COLORS.gray[500]} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Content */}
          <View className="p-4">{children}</View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
