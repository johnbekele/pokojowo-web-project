import { View, Text, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Heart, MessageSquare } from 'lucide-react-native';

import { Modal, Button, Avatar } from '@/components/ui';
import type { User } from '@/types/user.types';
import useTheme from '@/hooks/useTheme';

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
  const { t } = useTranslation('matching');
  const { colors } = useTheme();
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
            <View className="w-24 h-24 rounded-full bg-brand items-center justify-center">
              <Heart size={48} color={colors.brandFg} fill={colors.brandFg} />
            </View>
            {/* Floating hearts */}
            <View className="absolute -top-2 -right-2">
              <Heart size={24} color={colors.brand} fill={colors.brand} />
            </View>
            <View className="absolute -bottom-1 -left-3">
              <Heart size={20} color={colors.brand} fill={colors.brand} />
            </View>
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.Text
          style={{ opacity: fadeAnim }}
          className="text-2xl font-bold text-text mb-2"
        >
          {t('mutualMatch.title')}
        </Animated.Text>

        <Animated.Text
          style={{ opacity: fadeAnim }}
          className="text-muted text-center mb-6"
        >
          {t('mutualMatch.subtitle', { name: user.firstname || user.username })}
        </Animated.Text>

        {/* User avatar */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }} className="mb-8">
          <Avatar
            source={photoUrl}
            name={user.firstname || user.username || ''}
            size="xl"
          />
          <Text className="text-center mt-2 text-lg font-semibold text-text">
            {user.firstname || user.username}
          </Text>
        </Animated.View>

        {/* Action buttons */}
        <View className="w-full gap-3">
          <Button
            onPress={onSendMessage}
            variant="primary"
            fullWidth
            icon={<MessageSquare size={20} color={colors.brandFg} />}
          >
            {t('mutualMatch.sendMessage')}
          </Button>
          <Button
            onPress={onKeepSwiping}
            variant="ghost"
            fullWidth
          >
            {t('mutualMatch.keepSwiping')}
          </Button>
        </View>
      </View>
    </Modal>
  );
}
