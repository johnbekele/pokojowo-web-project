import { View, Text, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { Heart, MessageSquare } from 'lucide-react-native';

import { Modal, Button, Avatar } from '@/components/ui';
import type { User } from '@/types/user.types';
import { COLORS } from '@/lib/constants';

interface MutualMatchModalProps {
  visible: boolean;
  onClose: () => void;
  user: Partial<User> | null;
  onSendMessage?: () => void;
  onKeepSwiping?: () => void;
}

export default function MutualMatchModal({
  visible,
  onClose,
  user,
  onSendMessage,
  onKeepSwiping,
}: MutualMatchModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible, scaleAnim, fadeAnim]);

  if (!user) return null;

  const photoUrl = typeof user.photo === 'string'
    ? user.photo
    : (user.photo as { url?: string } | undefined)?.url || undefined;

  return (
    <Modal visible={visible} onClose={onClose} size="md" showCloseButton={false}>
      <View className="items-center py-4">
        {/* Celebration animation */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <View className="relative mb-6">
            <View className="w-24 h-24 rounded-full bg-primary-600 items-center justify-center">
              <Heart size={48} color="white" fill="white" />
            </View>
            {/* Floating hearts */}
            <View className="absolute -top-2 -right-2">
              <Heart size={24} color={COLORS.primary[400]} fill={COLORS.primary[400]} />
            </View>
            <View className="absolute -bottom-1 -left-3">
              <Heart size={20} color={COLORS.primary[300]} fill={COLORS.primary[300]} />
            </View>
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.Text
          style={{ opacity: fadeAnim }}
          className="text-2xl font-bold text-gray-900 mb-2"
        >
          It's a Match!
        </Animated.Text>

        <Animated.Text
          style={{ opacity: fadeAnim }}
          className="text-gray-500 text-center mb-6"
        >
          You and {user.firstname || user.username} liked each other
        </Animated.Text>

        {/* User avatar */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }} className="mb-8">
          <Avatar
            source={photoUrl}
            name={user.firstname || user.username || ''}
            size="xl"
          />
          <Text className="text-center mt-2 text-lg font-semibold text-gray-900">
            {user.firstname || user.username}
          </Text>
        </Animated.View>

        {/* Action buttons */}
        <View className="w-full gap-3">
          <Button
            onPress={onSendMessage}
            variant="primary"
            fullWidth
            icon={<MessageSquare size={20} color="white" />}
          >
            Send a Message
          </Button>
          <Button
            onPress={onKeepSwiping}
            variant="ghost"
            fullWidth
          >
            Keep Swiping
          </Button>
        </View>
      </View>
    </Modal>
  );
}
