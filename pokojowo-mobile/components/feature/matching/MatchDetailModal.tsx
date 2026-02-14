import { View, Text, Image, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import {
  Heart,
  MapPin,
  MessageSquare,
  X,
  Check,
  Briefcase,
  Globe,
  Calendar,
  Star,
  AlertCircle,
  ChevronLeft,
} from 'lucide-react-native';

import { Modal, Button, Badge } from '@/components/ui';
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

// Get tier color based on match quality
function getTierColor(tier?: string) {
  switch (tier) {
    case 'perfect': return { bg: 'bg-green-100', text: 'text-green-700', color: COLORS.success };
    case 'great': return { bg: 'bg-blue-100', text: 'text-blue-700', color: COLORS.primary[600] };
    case 'good': return { bg: 'bg-yellow-100', text: 'text-yellow-700', color: COLORS.warning };
    default: return { bg: 'bg-gray-100', text: 'text-gray-700', color: COLORS.gray[500] };
  }
}

// Format score breakdown key
function formatBreakdownKey(key: string) {
  return key
    .replace(/Score$/, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
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

  const {
    user,
    compatibility_score,
    score_breakdown,
    matched_preferences,
    potential_issues,
    // Additional fields from backend
    match_tier,
    explanations,
    shared_interests,
    shared_languages,
    is_new_user,
  } = match as MatchResult & {
    match_tier?: string;
    explanations?: Array<{ category: string; reason: string; impact: string; score: number }>;
    shared_interests?: string[];
    shared_languages?: string[];
    is_new_user?: boolean;
  };

  if (!user) return null;

  const photoUrl = typeof user.photo === 'string'
    ? user.photo
    : (user.photo as { url?: string } | undefined)?.url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400';

  const tierColors = getTierColor(match_tier);

  // Get positive and negative explanations
  const positiveExplanations = explanations?.filter(e => e.impact === 'positive') || [];
  const negativeExplanations = explanations?.filter(e => e.impact === 'negative') || [];

  return (
    <Modal visible={visible} onClose={onClose} size="full" showCloseButton={false}>
      <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
        {/* Header image with back button */}
        <View className="relative">
          <Image
            source={{ uri: photoUrl }}
            style={{ width: SCREEN_WIDTH, height: 400 }}
            resizeMode="cover"
          />

          {/* Back button */}
          <TouchableOpacity
            onPress={onClose}
            className="absolute top-12 left-4 bg-white/90 rounded-full p-2"
          >
            <ChevronLeft size={24} color={COLORS.gray[700]} />
          </TouchableOpacity>

          {/* New user badge */}
          {is_new_user && (
            <View className="absolute top-12 right-4 bg-primary-600 rounded-full px-3 py-1">
              <Text className="text-white font-semibold text-sm">New!</Text>
            </View>
          )}

          {/* Compatibility badge */}
          <View className="absolute bottom-4 left-4 right-4">
            <View className="bg-white rounded-2xl p-4 shadow-lg flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Heart size={24} color={tierColors.color} fill={tierColors.color} />
                <View className="ml-3">
                  <Text className="text-2xl font-bold text-gray-900">
                    {Math.round(compatibility_score)}%
                  </Text>
                  <Text className="text-gray-500 text-sm">Compatibility</Text>
                </View>
              </View>
              {match_tier && (
                <View className={`${tierColors.bg} rounded-full px-4 py-2`}>
                  <Text className={`${tierColors.text} font-semibold capitalize`}>
                    {match_tier} Match
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View className="p-4 -mt-2">
          {/* Name and basic info */}
          <View className="mb-4">
            <View className="flex-row items-center">
              <Text className="text-2xl font-bold text-gray-900">
                {user.firstname || user.username}
              </Text>
              {user.age && (
                <Text className="text-xl text-gray-500 ml-2">, {user.age}</Text>
              )}
            </View>

            <View className="flex-row flex-wrap gap-3 mt-2">
              {user.location && (
                <View className="flex-row items-center">
                  <MapPin size={16} color={COLORS.gray[500]} />
                  <Text className="text-gray-600 ml-1">{user.location}</Text>
                </View>
              )}
              {(user as any)?.job?.title && (
                <View className="flex-row items-center">
                  <Briefcase size={16} color={COLORS.gray[500]} />
                  <Text className="text-gray-600 ml-1">{(user as any).job.title}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Bio */}
          {user.bio && (
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-2">About</Text>
              <Text className="text-gray-600 leading-6 text-base">{user.bio}</Text>
            </View>
          )}

          {/* Languages */}
          {user.languages && user.languages.length > 0 && (
            <View className="mb-6">
              <View className="flex-row items-center mb-2">
                <Globe size={18} color={COLORS.gray[700]} />
                <Text className="text-lg font-semibold text-gray-900 ml-2">Languages</Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {user.languages.map((lang, idx) => (
                  <Badge key={idx} variant="default">{lang}</Badge>
                ))}
              </View>
              {shared_languages && shared_languages.length > 0 && (
                <Text className="text-green-600 text-sm mt-2">
                  You both speak: {shared_languages.join(', ')}
                </Text>
              )}
            </View>
          )}

          {/* Shared interests */}
          {shared_interests && shared_interests.length > 0 && (
            <View className="mb-6">
              <View className="flex-row items-center mb-3">
                <Star size={18} color={COLORS.primary[600]} />
                <Text className="text-lg font-semibold text-gray-900 ml-2">
                  Shared Interests ({shared_interests.length})
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {shared_interests.map((interest, idx) => (
                  <View key={idx} className="flex-row items-center bg-primary-50 rounded-full px-3 py-1.5">
                    <Check size={14} color={COLORS.primary[600]} />
                    <Text className="text-primary-700 ml-1.5 font-medium capitalize">{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Why you match - Positive explanations */}
          {positiveExplanations.length > 0 && (
            <View className="mb-6">
              <View className="flex-row items-center mb-3">
                <Check size={18} color={COLORS.success} />
                <Text className="text-lg font-semibold text-gray-900 ml-2">
                  Why You Match
                </Text>
              </View>
              <View className="bg-green-50 rounded-xl p-4">
                {positiveExplanations.slice(0, 5).map((exp, idx) => (
                  <View key={idx} className="flex-row items-start mb-2 last:mb-0">
                    <Check size={16} color={COLORS.success} className="mt-0.5" />
                    <View className="flex-1 ml-2">
                      <Text className="text-green-800 font-medium">{exp.category}</Text>
                      <Text className="text-green-700 text-sm">{exp.reason}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Things to consider - Negative explanations */}
          {negativeExplanations.length > 0 && (
            <View className="mb-6">
              <View className="flex-row items-center mb-3">
                <AlertCircle size={18} color={COLORS.warning} />
                <Text className="text-lg font-semibold text-gray-900 ml-2">
                  Things to Consider
                </Text>
              </View>
              <View className="bg-yellow-50 rounded-xl p-4">
                {negativeExplanations.slice(0, 3).map((exp, idx) => (
                  <View key={idx} className="flex-row items-start mb-2 last:mb-0">
                    <AlertCircle size={16} color={COLORS.warning} className="mt-0.5" />
                    <View className="flex-1 ml-2">
                      <Text className="text-yellow-800 font-medium">{exp.category}</Text>
                      <Text className="text-yellow-700 text-sm">{exp.reason}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Compatibility breakdown */}
          {score_breakdown && (
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                Compatibility Breakdown
              </Text>
              <View className="bg-gray-50 rounded-xl p-4">
                {Object.entries(score_breakdown)
                  .filter(([key]) => key !== 'totalScore')
                  .map(([key, value]) => (
                  <View key={key} className="mb-3 last:mb-0">
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-gray-700 font-medium">
                        {formatBreakdownKey(key)}
                      </Text>
                      <Text className="text-gray-900 font-semibold">{Math.round(value as number)}%</Text>
                    </View>
                    <View className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                      <View
                        className={`h-full rounded-full ${
                          (value as number) >= 80 ? 'bg-green-500' :
                          (value as number) >= 60 ? 'bg-primary-500' :
                          (value as number) >= 40 ? 'bg-yellow-500' : 'bg-red-400'
                        }`}
                        style={{ width: `${value}%` }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Matched preferences (legacy) */}
          {matched_preferences && matched_preferences.length > 0 && !shared_interests?.length && (
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                You Both Share
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

          {/* Potential issues (legacy) */}
          {potential_issues && potential_issues.length > 0 && !negativeExplanations?.length && (
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                Things to Consider
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {potential_issues.map((issue, idx) => (
                  <View key={idx} className="flex-row items-center bg-yellow-50 rounded-full px-3 py-1.5">
                    <AlertCircle size={14} color={COLORS.warning} />
                    <Text className="text-yellow-700 ml-1.5 font-medium">{issue}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Spacer for bottom buttons */}
          <View className="h-20" />
        </View>
      </ScrollView>

      {/* Action buttons - Fixed at bottom */}
      <View className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between p-4 border-t border-gray-100 bg-white">
        <Button
          onPress={() => { onPass?.(); onClose(); }}
          variant="outline"
          className="flex-1 mr-2"
          icon={<X size={20} color={COLORS.gray[700]} />}
        >
          Pass
        </Button>
        {onMessage && (
          <Button
            onPress={onMessage}
            variant="secondary"
            className="flex-1 mx-2"
            icon={<MessageSquare size={20} color={COLORS.gray[700]} />}
          >
            Message
          </Button>
        )}
        <Button
          onPress={() => { onLike?.(); onClose(); }}
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
