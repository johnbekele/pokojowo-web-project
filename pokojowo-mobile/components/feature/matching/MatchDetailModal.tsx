import { View, Text, Image, ScrollView, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  Heart,
  MapPin,
  MessageSquare,
  X,
  Check,
  Minus,
  ChevronLeft,
  Globe2,
  Briefcase,
  Users,
} from 'lucide-react-native';

import { Modal, Button, Badge, Avatar } from '@/components/ui';
import { matchingService } from '@/services';
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

// Labels for score breakdown categories
const BREAKDOWN_LABELS: Record<string, string> = {
  budgetScore: 'Budget',
  lifestyleScore: 'Lifestyle',
  personalityScore: 'Personality',
  scheduleScore: 'Schedule',
  locationScore: 'Location',
  preferencesScore: 'Preferences',
  interestsScore: 'Interests',
};

// Get score color
function getScoreColor(score: number) {
  if (score >= 85) return COLORS.success;
  if (score >= 70) return COLORS.primary[600];
  if (score >= 55) return COLORS.warning;
  return COLORS.gray[400];
}

function getScoreBgClass(score: number) {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-primary-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-gray-400';
}

export default function MatchDetailModal({
  visible,
  onClose,
  match,
  onLike,
  onPass,
  onMessage,
}: MatchDetailModalProps) {
  // Fetch detailed match data
  const { data: detailData, isLoading } = useQuery({
    queryKey: ['match', match?.user_id],
    queryFn: async () => {
      const response = await matchingService.getMatchWithUser(match!.user_id);
      return response.data;
    },
    enabled: visible && !!match?.user_id,
  });

  if (!visible || !match) return null;

  // Use detailed data if available, fallback to basic match data
  const userData = detailData || match;

  // Extract fields - handle both nested user object and flat structure
  const user_id = userData.user_id || (userData as any).user?.id;
  const firstname = (userData as any).firstname || (userData as any).user?.firstname;
  const lastname = (userData as any).lastname || (userData as any).user?.lastname;
  const username = (userData as any).username || (userData as any).user?.username;
  const photo = (userData as any).photo || (userData as any).user?.photo;
  const age = (userData as any).age || (userData as any).user?.age;
  const bio = (userData as any).bio || (userData as any).user?.bio;
  const location = (userData as any).location || (userData as any).user?.location;
  const languages = (userData as any).languages || (userData as any).user?.languages || [];
  const job = (userData as any).job || (userData as any).user?.job;

  const compatibility_score = userData.compatibility_score || 0;
  const score_breakdown = userData.score_breakdown;
  const rawExplanations = (userData as any).explanations || [];
  const shared_interests = (userData as any).shared_interests || [];
  const shared_languages = (userData as any).shared_languages || [];

  const score = Math.round(compatibility_score);

  // Get photo URL
  const photoUrl = typeof photo === 'string'
    ? photo
    : (photo as { url?: string })?.url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400';

  // Group explanations by impact
  const explanations = {
    positive: rawExplanations.filter((e: any) => e.impact === 'positive') || [],
    neutral: rawExplanations.filter((e: any) => e.impact === 'neutral') || [],
    negative: rawExplanations.filter((e: any) => e.impact === 'negative') || [],
  };

  // Filter and format score breakdown
  const breakdownItems = score_breakdown
    ? Object.entries(score_breakdown)
        .filter(([key]) => key !== 'totalScore' && BREAKDOWN_LABELS[key])
        .map(([key, value]) => ({
          key,
          label: BREAKDOWN_LABELS[key],
          value: Math.round(value as number),
        }))
        .sort((a, b) => b.value - a.value)
    : [];

  return (
    <Modal visible={visible} onClose={onClose} size="full" showCloseButton={false}>
      {/* Header with close button */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={onClose} className="p-2 -ml-2">
          <ChevronLeft size={24} color={COLORS.gray[700]} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">Profile</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color={COLORS.primary[600]} />
            <Text className="text-gray-500 mt-4">Loading profile...</Text>
          </View>
        ) : (
          <View className="pb-32">
            {/* Photo and Score Header */}
            <View className="flex-row items-center gap-4 p-4">
              {/* Photo with score badge */}
              <View className="relative">
                <Image
                  source={{ uri: photoUrl }}
                  className="w-28 h-28 rounded-2xl"
                  resizeMode="cover"
                />
                {/* Score badge */}
                <View
                  className={`absolute -bottom-2 -right-2 w-12 h-12 rounded-full items-center justify-center ${getScoreBgClass(score)}`}
                >
                  <Text className="text-white font-bold text-sm">{score}%</Text>
                </View>
              </View>

              {/* Info */}
              <View className="flex-1">
                <Text className="text-2xl font-bold text-gray-900">
                  {firstname} {lastname}
                </Text>
                {username && (
                  <Text className="text-gray-500">@{username}</Text>
                )}

                <View className="flex-row flex-wrap gap-2 mt-2">
                  {age && (
                    <Badge variant="default">{age} years old</Badge>
                  )}
                  {location && (
                    <View className="flex-row items-center bg-gray-100 rounded-full px-2.5 py-1">
                      <MapPin size={12} color={COLORS.gray[500]} />
                      <Text className="text-gray-600 text-xs ml-1">{location}</Text>
                    </View>
                  )}
                </View>

                {/* Languages */}
                {languages.length > 0 && (
                  <View className="flex-row flex-wrap gap-1 mt-2">
                    {languages.slice(0, 3).map((lang: string, idx: number) => (
                      <Badge key={idx} variant="default" size="sm">{lang}</Badge>
                    ))}
                    {languages.length > 3 && (
                      <Badge variant="default" size="sm">+{languages.length - 3}</Badge>
                    )}
                  </View>
                )}
              </View>
            </View>

            {/* Bio */}
            {bio && (
              <View className="px-4 mb-4">
                <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  About
                </Text>
                <Text className="text-gray-700 leading-6">{bio}</Text>
              </View>
            )}

            {/* Job */}
            {job?.title && (
              <View className="px-4 mb-4">
                <View className="flex-row items-center gap-2">
                  <Briefcase size={16} color={COLORS.gray[500]} />
                  <Text className="text-gray-700">{job.title}</Text>
                  {job.industry && (
                    <Text className="text-gray-500">• {job.industry}</Text>
                  )}
                </View>
              </View>
            )}

            {/* Divider */}
            <View className="h-2 bg-gray-100 my-2" />

            {/* Compatibility Breakdown */}
            {breakdownItems.length > 0 && (
              <View className="px-4 py-4">
                <View className="flex-row items-center gap-2 mb-4">
                  <Users size={18} color={COLORS.gray[700]} />
                  <Text className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                    Flatmate Compatibility
                  </Text>
                </View>
                <View className="space-y-3">
                  {breakdownItems.map(({ key, label, value }) => (
                    <View key={key} className="mb-3">
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-gray-600">{label}</Text>
                        <Text
                          className="font-semibold"
                          style={{ color: getScoreColor(value) }}
                        >
                          {value}%
                        </Text>
                      </View>
                      <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <View
                          className={`h-full rounded-full ${getScoreBgClass(value)}`}
                          style={{ width: `${value}%` }}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Why You Match */}
            {(explanations.positive.length > 0 || explanations.neutral.length > 0 || explanations.negative.length > 0) && (
              <View className="px-4 py-4">
                <Text className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Why You Match
                </Text>
                <View className="space-y-2">
                  {explanations.positive.map((exp: any, i: number) => (
                    <View key={i} className="flex-row items-start gap-2 bg-green-50 rounded-lg p-3">
                      <Check size={16} color={COLORS.success} className="mt-0.5" />
                      <Text className="flex-1 text-green-700 text-sm">{exp.reason}</Text>
                    </View>
                  ))}
                  {explanations.neutral.map((exp: any, i: number) => (
                    <View key={i} className="flex-row items-start gap-2 bg-gray-100 rounded-lg p-3">
                      <Minus size={16} color={COLORS.gray[500]} className="mt-0.5" />
                      <Text className="flex-1 text-gray-600 text-sm">{exp.reason}</Text>
                    </View>
                  ))}
                  {explanations.negative.map((exp: any, i: number) => (
                    <View key={i} className="flex-row items-start gap-2 bg-yellow-50 rounded-lg p-3">
                      <X size={16} color={COLORS.warning} className="mt-0.5" />
                      <Text className="flex-1 text-yellow-700 text-sm">{exp.reason}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Shared Interests */}
            {shared_interests.length > 0 && (
              <View className="px-4 py-4">
                <Text className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Shared Interests
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {shared_interests.map((interest: string, idx: number) => (
                    <Badge key={idx} variant="primary">{interest}</Badge>
                  ))}
                </View>
              </View>
            )}

            {/* Shared Languages */}
            {shared_languages.length > 0 && (
              <View className="px-4 py-4">
                <View className="flex-row items-center gap-2 mb-3">
                  <Globe2 size={16} color={COLORS.gray[500]} />
                  <Text className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                    Shared Languages
                  </Text>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {shared_languages.map((lang: string, idx: number) => (
                    <Badge key={idx} variant="success">{lang}</Badge>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Fixed Action Buttons */}
      <View className="absolute bottom-0 left-0 right-0 p-4 pb-8 bg-white border-t border-gray-100">
        <View className="flex-row gap-2">
          <Button
            onPress={() => { onPass?.(); onClose(); }}
            variant="outline"
            className="flex-1"
            icon={<X size={18} color={COLORS.gray[600]} />}
          >
            Skip
          </Button>
          <Button
            onPress={() => { onLike?.(); onClose(); }}
            variant="primary"
            className="flex-1"
            style={{ backgroundColor: '#14b8a6' }}
            icon={<Heart size={18} color="white" />}
          >
            Interested
          </Button>
          {onMessage && (
            <Button
              onPress={onMessage}
              variant="outline"
              className="flex-1"
              icon={<MessageSquare size={18} color={COLORS.gray[600]} />}
            >
              Chat
            </Button>
          )}
        </View>
      </View>
    </Modal>
  );
}
