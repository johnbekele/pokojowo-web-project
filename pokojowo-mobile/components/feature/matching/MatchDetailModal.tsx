import { View, Text, Image, ScrollView, Dimensions } from 'react-native';
import { Heart, MapPin, MessageSquare, X, Check } from 'lucide-react-native';

import { Modal, Button, Badge, Avatar } from '@/components/ui';
import type { MatchResult } from '@/types/matching.types';
import { COLORS } from '@/lib/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MatchDetailModalProps {
  visible: boolean;
  onClose: () => void;
  match: MatchResult | null;
  onLike?: () => void;
  onPass?: () => void;
  onMessage?: () => void;
}

export default function MatchDetailModal({
  visible,
  onClose,
  match,
  onLike,
  onPass,
  onMessage,
}: MatchDetailModalProps) {
  if (!match) return null;

  const { user, compatibility_score, score_breakdown, matched_preferences, potential_issues } = match;

  const photoUrl = typeof user.photo === 'string'
    ? user.photo
    : (user.photo as { url?: string } | undefined)?.url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400';

  return (
    <Modal visible={visible} onClose={onClose} size="full" showCloseButton={false}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header image */}
        <View className="relative">
          <Image
            source={{ uri: photoUrl }}
            style={{ width: SCREEN_WIDTH, height: 350 }}
            resizeMode="cover"
          />
          {/* Compatibility badge */}
          <View className="absolute bottom-4 right-4 bg-white rounded-full px-4 py-2 flex-row items-center shadow-lg">
            <Heart size={20} color={COLORS.primary[600]} fill={COLORS.primary[600]} />
            <Text className="text-primary-600 font-bold text-lg ml-2">
              {Math.round(compatibility_score)}% Match
            </Text>
          </View>
        </View>

        <View className="p-4">
          {/* Name and basic info */}
          <View className="mb-4">
            <View className="flex-row items-center">
              <Text className="text-2xl font-bold text-gray-900">
                {user.firstname || user.username}
              </Text>
              {user.age && (
                <Text className="text-xl text-gray-500 ml-2">{user.age}</Text>
              )}
            </View>
            {user.location && (
              <View className="flex-row items-center mt-1">
                <MapPin size={16} color={COLORS.gray[500]} />
                <Text className="text-gray-500 ml-1">{user.location}</Text>
              </View>
            )}
          </View>

          {/* Bio */}
          {user.bio && (
            <View className="mb-6">
              <Text className="text-base font-semibold text-gray-900 mb-2">About</Text>
              <Text className="text-gray-600 leading-6">{user.bio}</Text>
            </View>
          )}

          {/* Compatibility breakdown */}
          {score_breakdown && (
            <View className="mb-6">
              <Text className="text-base font-semibold text-gray-900 mb-3">
                Compatibility Breakdown
              </Text>
              <View className="bg-gray-50 rounded-xl p-4">
                {Object.entries(score_breakdown).map(([key, value]) => (
                  <View key={key} className="mb-3 last:mb-0">
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-gray-700 capitalize">
                        {key.replace('_', ' ')}
                      </Text>
                      <Text className="text-gray-900 font-medium">{Math.round(value)}%</Text>
                    </View>
                    <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <View
                        className="h-full bg-primary-500 rounded-full"
                        style={{ width: `${value}%` }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Matched preferences */}
          {matched_preferences && matched_preferences.length > 0 && (
            <View className="mb-6">
              <Text className="text-base font-semibold text-gray-900 mb-3">
                You both share
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {matched_preferences.map((pref, idx) => (
                  <View key={idx} className="flex-row items-center bg-green-50 rounded-full px-3 py-1.5">
                    <Check size={14} color={COLORS.success} />
                    <Text className="text-green-700 ml-1.5 font-medium">{pref}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Potential issues */}
          {potential_issues && potential_issues.length > 0 && (
            <View className="mb-6">
              <Text className="text-base font-semibold text-gray-900 mb-3">
                Things to consider
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {potential_issues.map((issue, idx) => (
                  <View key={idx} className="flex-row items-center bg-yellow-50 rounded-full px-3 py-1.5">
                    <Text className="text-yellow-700 font-medium">{issue}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action buttons */}
      <View className="flex-row items-center justify-between p-4 border-t border-gray-100 bg-white">
        <Button
          onPress={onPass}
          variant="outline"
          className="flex-1 mr-2"
          icon={<X size={20} color={COLORS.gray[700]} />}
        >
          Pass
        </Button>
        <Button
          onPress={onMessage}
          variant="secondary"
          className="flex-1 mx-2"
          icon={<MessageSquare size={20} color={COLORS.gray[700]} />}
        >
          Message
        </Button>
        <Button
          onPress={onLike}
          variant="primary"
          className="flex-1 ml-2"
          icon={<Heart size={20} color="white" />}
        >
          Like
        </Button>
      </View>
    </Modal>
  );
}
