import { useState } from 'react';
import { View, Text, Image, ScrollView, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Heart,
  MapPin,
  MessageSquare,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Check,
  AlertCircle,
  Briefcase,
  Globe2,
} from 'lucide-react-native';

import { Button, Badge, EmptyState } from '@/components/ui';
import { UserActionsMenu } from '@/components/feature/profile';
import { useMatchWithUser } from '@/hooks/matching/useMatching';
import { useLikeUser, useLikeStatus } from '@/hooks/likes/useLikes';
import { useOpenChatWithUser } from '@/hooks/chat/useOpenChatWithUser';
import useTheme from '@/hooks/useTheme';
import { getAvatarUrl } from '@/lib/image';
import { translateExplanation } from '@/lib/explanations';
import { getLivingHighlights, getLivingFacts } from '@/lib/livingProfile';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MatchProfileScreen() {
  const { t } = useTranslation('matching');
  const router = useRouter();
  const { colors } = useTheme();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [showAllDetails, setShowAllDetails] = useState(false);

  const { data: matchData, isLoading, error } = useMatchWithUser(userId || '');
  const { data: likeStatus } = useLikeStatus(userId || '');
  const { mutate: likeUser, isPending: isLiking } = useLikeUser();
  const { openChat, isOpeningChat } = useOpenChatWithUser();

  const handleLike = () => {
    if (userId) {
      likeUser(userId, {
        onSuccess: (response) => {
          if (response.data.is_mutual) {
            // Could show a modal here
          }
        },
      });
    }
  };

  const handleMessage = () => {
    if (userId) {
      openChat(userId);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator size="large" color={colors.brand} />
      </SafeAreaView>
    );
  }

  if (error || !matchData) {
    return (
      <SafeAreaView className="flex-1 bg-bg">
        <View className="flex-row items-center px-4 py-3 border-b border-border">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 min-h-[44px] min-w-[44px] items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel={t('accessibility.back', 'Go back')}
          >
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-text">
            {t('detail.title', 'Profile')}
          </Text>
        </View>
        <EmptyState
          icon="alert-circle"
          title={t('error.notFound', 'Profile not found')}
          description={t('error.notFoundDescription', 'This profile may no longer be available')}
          action={{
            label: t('error.goBack', 'Go Back'),
            onPress: () => router.back(),
          }}
        />
      </SafeAreaView>
    );
  }

  const { user, compatibility_score, score_breakdown, explanations, living_profile } = matchData;
  const sharedInterests = matchData.shared_interests ?? [];
  const sharedLanguages = matchData.shared_languages ?? [];

  const photoUrl = getAvatarUrl(
    user?.photo as string | { url?: string } | undefined,
    userId || user?.username
  );

  const isLiked = likeStatus?.i_liked || false;
  const isMutual = likeStatus?.is_mutual || false;

  const highlights = getLivingHighlights(living_profile, t);
  const livingFacts = getLivingFacts(living_profile, t);

  const positives = (explanations ?? []).filter((e) => e.impact === 'positive');
  const considerations = (explanations ?? []).filter((e) => e.impact === 'negative');

  // Summary shows only the strongest signals; the rest sits behind the toggle.
  const breakdownEntries = Object.entries(score_breakdown ?? {})
    .filter(([key]) => key !== 'totalScore' && key !== 'dataCompleteness')
    // API sends `budgetScore`; the translation keys are unsuffixed (`budget`).
    .map(([key, value]) => ({
      key,
      labelKey: key.replace(/Score$/, ''),
      value: Math.round(value as number),
    }))
    .sort((a, b) => b.value - a.value);
  const visibleBreakdown = showAllDetails ? breakdownEntries : breakdownEntries.slice(0, 3);
  const visiblePositives = showAllDetails ? positives : positives.slice(0, 2);
  const visibleHighlights = showAllDetails ? highlights : highlights.slice(0, 5);

  const hasMoreToShow =
    breakdownEntries.length > 3 ||
    positives.length > 2 ||
    highlights.length > 5 ||
    considerations.length > 0 ||
    livingFacts.length > 0 ||
    (living_profile?.interests?.length ?? 0) > 0;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      {/* Header */}
      <View className="absolute top-12 left-4 right-4 z-10 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-11 h-11 rounded-full bg-black/40 items-center justify-center shadow-lg"
          accessibilityRole="button"
          accessibilityLabel={t('accessibility.back', 'Go back')}
        >
          <ChevronLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        {userId && <UserActionsMenu userId={userId} onBlocked={() => router.back()} />}
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header image */}
        <View className="relative">
          <Image
            source={{ uri: photoUrl }}
            style={{ width: SCREEN_WIDTH, height: 350 }}
            resizeMode="cover"
            accessible
            accessibilityLabel={t('accessibility.profilePhoto', 'Profile photo of {{name}}', {
              name: user?.firstname || user?.username || t('detail.unknown', 'Unknown'),
            })}
          />

          {/* Compatibility badge */}
          {compatibility_score && (
            <View className="absolute bottom-4 right-4 bg-card rounded-full px-4 py-2 flex-row items-center shadow-lg">
              <Heart size={20} color={colors.brand} fill={colors.brand} />
              <Text className="text-brand font-bold text-lg ml-2">
                {Math.round(compatibility_score)}% {t('score.label', 'Match')}
              </Text>
            </View>
          )}
        </View>

        <View className="p-4">
          {/* Name and basic info */}
          <View className="mb-4">
            <View className="flex-row items-center">
              <Text className="text-2xl font-bold text-text">
                {user?.firstname || user?.username || t('detail.unknown', 'Unknown')}
              </Text>
              {user?.age && (
                <Text className="text-xl text-muted ml-2">{user.age}</Text>
              )}
              {isMutual && (
                <Badge variant="success" className="ml-2">
                  {t('likes.mutual.matchBadge', 'Mutual')}
                </Badge>
              )}
            </View>
            {user?.location && (
              <View className="flex-row items-center mt-1">
                <MapPin size={16} color={colors.muted} />
                <Text className="text-muted ml-1">{user.location}</Text>
              </View>
            )}
          </View>

          {/* Job and languages */}
          {(user?.job?.title || (user?.languages?.length ?? 0) > 0) && (
            <View className="mb-4 gap-2">
              {user?.job?.title && (
                <View className="flex-row items-center gap-2">
                  <Briefcase size={16} color={colors.muted} />
                  <Text className="text-text">{user.job.title}</Text>
                  {user.job.industry && (
                    <Text className="text-muted">• {user.job.industry}</Text>
                  )}
                </View>
              )}
              {(user?.languages?.length ?? 0) > 0 && (
                <View className="flex-row items-center gap-2">
                  <Globe2 size={16} color={colors.muted} />
                  <View className="flex-row flex-wrap gap-1.5 flex-1">
                    {user!.languages!.map((lang: string, idx: number) => (
                      <Badge key={idx} variant="default" size="sm">{lang}</Badge>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Bio */}
          {user?.bio && (
            <View className="mb-6">
              <Text className="text-base font-semibold text-text mb-2">
                {t('detail.about', 'About')}
              </Text>
              <Text className="text-muted leading-6">{user.bio}</Text>
            </View>
          )}

          {/* What they're like */}
          {visibleHighlights.length > 0 && (
            <View className="mb-6">
              <Text className="text-base font-semibold text-text mb-3">
                {t('detail.livingStyle', 'What they’re like')}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {visibleHighlights.map((chip) => (
                  <View key={chip} className="bg-surface rounded-full px-3 py-1.5">
                    <Text className="text-text font-medium">{chip}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Why you match */}
          {visiblePositives.length > 0 && (
            <View className="mb-6">
              <Text className="text-base font-semibold text-text mb-3">
                {t('detail.whyYouMatch', 'Why you match')}
              </Text>
              <View className="gap-2">
                {visiblePositives.map((exp, idx) => (
                  <View key={idx} className="flex-row items-start gap-2 bg-green-50 rounded-lg p-3">
                    <Check size={16} color={colors.success} />
                    <Text className="flex-1 text-green-700 text-sm">
                      {translateExplanation(t, exp)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {considerations.length > 0 && (
            <View className="mb-6 rounded-xl border border-border bg-surface p-4">
              <View className="mb-2 flex-row items-center gap-2">
                <AlertCircle size={17} color={colors.warning} />
                <Text className="font-semibold text-text">
                  {t('detail.thingsToConsider', 'Things to consider')}
                </Text>
              </View>
              {considerations.slice(0, 2).map((exp, idx) => (
                <Text key={idx} className="mb-1 text-sm leading-5 text-muted">
                  • {translateExplanation(t, exp)}
                </Text>
              ))}
            </View>
          )}

          {/* Shared interests */}
          {sharedInterests.length > 0 && (
            <View className="mb-6">
              <Text className="text-base font-semibold text-text mb-3">
                {t('detail.sharedInterests', 'You both share')}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {sharedInterests.map((pref: string, idx: number) => (
                  <View key={idx} className="flex-row items-center bg-green-50 rounded-full px-3 py-1.5">
                    <Check size={14} color={colors.success} />
                    <Text className="text-green-700 ml-1.5 font-medium">{pref}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Compatibility breakdown */}
          {visibleBreakdown.length > 0 && (
            <View className="mb-6">
              <Text className="text-base font-semibold text-text mb-3">
                {t('detail.compatibility', 'Compatibility Breakdown')}
              </Text>
              <View className="bg-surface rounded-xl p-4">
                {visibleBreakdown.map(({ key, labelKey, value }) => (
                  <View key={key} className="mb-3 last:mb-0">
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-text capitalize">
                        {t(`breakdown.${labelKey}`, labelKey)}
                      </Text>
                      <Text className="text-text font-medium">{value}%</Text>
                    </View>
                    <View className="h-2 bg-border rounded-full overflow-hidden">
                      <View
                        className="h-full bg-brand rounded-full"
                        style={{ width: `${value}%` }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {showAllDetails && (
            <>
              {/* Full living details */}
              {livingFacts.length > 0 && (
                <View className="mb-6">
                  <Text className="text-base font-semibold text-text mb-3">
                    {t('detail.livingDetails', 'Living details')}
                  </Text>
                  <View className="bg-surface rounded-xl p-4">
                    {livingFacts.map((fact) => (
                      <View
                        key={fact.key}
                        className="flex-row justify-between items-start py-1.5 gap-4"
                      >
                        <Text className="text-muted flex-shrink-0">{fact.label}</Text>
                        <Text className="text-text font-medium text-right flex-1">
                          {fact.value}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* All interests */}
              {(living_profile?.interests?.length ?? 0) > 0 && (
                <View className="mb-6">
                  <Text className="text-base font-semibold text-text mb-3">
                    {t('detail.interests', 'Interests')}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {living_profile!.interests!.map((interest, idx) => (
                      <Badge key={idx} variant="default">{interest}</Badge>
                    ))}
                  </View>
                </View>
              )}

              {/* Shared languages */}
              {sharedLanguages.length > 0 && (
                <View className="mb-6">
                  <Text className="text-base font-semibold text-text mb-3">
                    {t('detail.sharedLanguages', 'Languages you share')}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {sharedLanguages.map((lang: string, idx: number) => (
                      <Badge key={idx} variant="success">{lang}</Badge>
                    ))}
                  </View>
                </View>
              )}

              {/* Things to consider */}
              {considerations.length > 0 && (
                <View className="mb-6">
                  <Text className="text-base font-semibold text-text mb-3">
                    {t('detail.thingsToConsider', 'Things to consider')}
                  </Text>
                  <View className="gap-2">
                    {considerations.map((exp, idx) => (
                      <View
                        key={idx}
                        className="flex-row items-start gap-2 rounded-lg bg-surface p-3"
                      >
                        <AlertCircle size={16} color={colors.warning} />
                        <Text className="flex-1 text-sm text-text">
                          {translateExplanation(t, exp)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}

          {/* Show / hide the rest */}
          {hasMoreToShow && (
            <TouchableOpacity
              onPress={() => setShowAllDetails((v) => !v)}
              className="flex-row items-center justify-center gap-2 border border-border rounded-xl py-3 mb-2"
              accessibilityRole="button"
            >
              <Text className="text-brand font-semibold">
                {showAllDetails
                  ? t('detail.showLess', 'Show less')
                  : t('detail.seeAllDetails', 'See all details')}
              </Text>
              {showAllDetails ? (
                <ChevronUp size={18} color={colors.brand} />
              ) : (
                <ChevronDown size={18} color={colors.brand} />
              )}
            </TouchableOpacity>
          )}

          {/* Bottom padding for action buttons */}
          <View className="h-24" />
        </View>
      </ScrollView>

      {/* Action buttons */}
      <View className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between p-4 border-t border-border bg-bg">
        {isMutual ? (
          <Button
            onPress={handleMessage}
            variant="primary"
            className="flex-1"
            loading={isOpeningChat}
            icon={<MessageSquare size={20} color="white" />}
          >
            {t('card.chat', 'Send Message')}
          </Button>
        ) : (
          <>
            <Button
              onPress={handleMessage}
              variant="outline"
              className="flex-1 mr-2"
              loading={isOpeningChat}
              icon={<MessageSquare size={20} color={colors.text} />}
            >
              {t('card.sendMessage', 'Message')}
            </Button>
            <Button
              onPress={handleLike}
              variant="primary"
              className="flex-1 ml-2"
              disabled={isLiked || isLiking}
              icon={<Heart size={20} color="white" fill={isLiked ? 'white' : 'none'} />}
            >
              {isLiked ? t('likes.actions.liked', 'Liked') : t('likes.actions.like', 'Like')}
            </Button>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
