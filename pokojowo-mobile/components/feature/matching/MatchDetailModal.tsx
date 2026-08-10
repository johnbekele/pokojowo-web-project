import { View, Text, Image, ScrollView, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
import { translateExplanation } from '@/lib/explanations';
import { getAvatarUrl } from '@/lib/image';
import { palette } from '@/lib/theme';
import useTheme from '@/hooks/useTheme';

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
  budgetScore: 'breakdown.budget',
  lifestyleScore: 'breakdown.lifestyle',
  personalityScore: 'breakdown.personality',
  scheduleScore: 'breakdown.schedule',
  locationScore: 'breakdown.location',
  preferencesScore: 'breakdown.preferences',
  interestsScore: 'breakdown.interests',
};

// Get score color
function getScoreColor(score: number) {
  if (score >= 85) return palette.status.success;
  if (score >= 70) return palette.primary[600];
  if (score >= 55) return palette.status.warning;
  return palette.gray[400];
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
  const { colors } = useTheme();
  const { t } = useTranslation('matching');
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
  const photoUrl = getAvatarUrl(photo as string | { url?: string } | undefined, user_id || username);

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
          label: t(BREAKDOWN_LABELS[key]),
          value: Math.round(value as number),
        }))
        .sort((a, b) => b.value - a.value)
    : [];

  return (
    <Modal visible={visible} onClose={onClose} size="full" showCloseButton={false}>
      {/* Header with close button */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={onClose} className="p-2 -ml-2">
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-text">{t('detail.title')}</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 bg-bg" showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color={colors.brand} />
            <Text className="text-muted mt-4">{t('detail.loading')}</Text>
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
                <Text className="text-2xl font-bold text-text">
                  {firstname} {lastname}
                </Text>
                {username && (
                  <Text className="text-muted">@{username}</Text>
                )}

                <View className="flex-row flex-wrap gap-2 mt-2">
                  {age && (
                    <Badge variant="default">{t('card.yearsOld', { age })}</Badge>
                  )}
                  {location && (
                    <View className="flex-row items-center bg-surface rounded-full px-2.5 py-1">
                      <MapPin size={12} color={colors.muted} />
                      <Text className="text-muted text-xs ml-1">{location}</Text>
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
                <Text className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                  {t('detail.about')}
                </Text>
                <Text className="text-text leading-6">{bio}</Text>
              </View>
            )}

            {/* Job */}
            {job?.title && (
              <View className="px-4 mb-4">
                <View className="flex-row items-center gap-2">
                  <Briefcase size={16} color={colors.muted} />
                  <Text className="text-text">{job.title}</Text>
                  {job.industry && (
                    <Text className="text-muted">• {job.industry}</Text>
                  )}
                </View>
              </View>
            )}

            {/* Divider */}
            <View className="h-2 bg-surface my-2" />

            {/* Compatibility Breakdown */}
            {breakdownItems.length > 0 && (
              <View className="px-4 py-4">
                <View className="flex-row items-center gap-2 mb-4">
                  <Users size={18} color={colors.text} />
                  <Text className="text-sm font-semibold text-muted uppercase tracking-wide">
                    {t('detail.compatibility')}
                  </Text>
                </View>
                <View className="space-y-3">
                  {breakdownItems.map(({ key, label, value }) => (
                    <View key={key} className="mb-3">
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-muted">{label}</Text>
                        <Text
                          className="font-semibold"
                          style={{ color: getScoreColor(value) }}
                        >
                          {value}%
                        </Text>
                      </View>
                      <View className="h-2 bg-surface rounded-full overflow-hidden">
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
                <Text className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
                  {t('detail.whyYouMatch')}
                </Text>
                <View className="space-y-2">
                  {explanations.positive.map((exp: any, i: number) => (
                    <View key={i} className="flex-row items-start gap-2 bg-green-50 rounded-lg p-3">
                      <Check size={16} color={colors.success} className="mt-0.5" />
                      <Text className="flex-1 text-green-700 text-sm">{translateExplanation(t, exp)}</Text>
                    </View>
                  ))}
                  {explanations.neutral.map((exp: any, i: number) => (
                    <View key={i} className="flex-row items-start gap-2 bg-surface rounded-lg p-3">
                      <Minus size={16} color={colors.muted} className="mt-0.5" />
                      <Text className="flex-1 text-muted text-sm">{translateExplanation(t, exp)}</Text>
                    </View>
                  ))}
                  {explanations.negative.map((exp: any, i: number) => (
                    <View key={i} className="flex-row items-start gap-2 bg-yellow-50 rounded-lg p-3">
                      <X size={16} color={colors.warning} className="mt-0.5" />
                      <Text className="flex-1 text-yellow-700 text-sm">{translateExplanation(t, exp)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Shared Interests */}
            {shared_interests.length > 0 && (
              <View className="px-4 py-4">
                <Text className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
                  {t('detail.sharedInterests')}
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
                  <Globe2 size={16} color={colors.muted} />
                  <Text className="text-sm font-semibold text-muted uppercase tracking-wide">
                    {t('detail.sharedLanguages')}
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
      <View className="absolute bottom-0 left-0 right-0 p-4 pb-8 bg-bg border-t border-border">
        <View className="flex-row gap-2">
          <Button
            onPress={() => { onPass?.(); onClose(); }}
            variant="outline"
            className="flex-1"
            icon={<X size={18} color={colors.muted} />}
          >
            {t('detail.skip')}
          </Button>
          <Button
            onPress={() => { onLike?.(); onClose(); }}
            variant="primary"
            className="flex-1"
            icon={<Heart size={18} color="white" />}
          >
            {t('detail.interested')}
          </Button>
          {onMessage && (
            <Button
              onPress={onMessage}
              variant="outline"
              className="flex-1"
              icon={<MessageSquare size={18} color={colors.muted} />}
            >
              {t('detail.chat')}
            </Button>
          )}
        </View>
      </View>
    </Modal>
  );
}
