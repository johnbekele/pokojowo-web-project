import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Users, SlidersHorizontal } from 'lucide-react-native';

import {
  SwipeStack,
  MatchDetailModal,
  MutualMatchModal,
  MatchFiltersModal,
  MatchDashboardCard,
} from '@/components/feature/matching';
import { LoadingSpinner, EmptyState } from '@/components/ui';
import { useMatches, useRefreshMatches } from '@/hooks/matching/useMatching';
import { useLikeUser } from '@/hooks/likes/useLikes';
import type { MatchResult, MatchingFilters } from '@/types/matching.types';
import useTheme from '@/hooks/useTheme';
import useUIStore from '@/stores/uiStore';

export default function MatchesScreen() {
  const { t } = useTranslation('matching');
  const router = useRouter();
  const { colors } = useTheme();
  const showToast = useUIStore((s) => s.showToast);

  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);
  const [mutualMatchUser, setMutualMatchUser] = useState<MatchResult['user'] | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showMutualModal, setShowMutualModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [filters, setFilters] = useState<MatchingFilters>({ limit: 50 });

  const { data: matchingData, isLoading, error } = useMatches(filters);
  const { mutate: refreshMatches, isPending: isRefreshing } = useRefreshMatches();
  const { mutate: likeUser } = useLikeUser();

  const activeFilterCount = [
    filters.location,
    filters.minScore && filters.minScore > 0,
  ].filter(Boolean).length;

  const handleApplyFilters = (newFilters: MatchingFilters) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({ limit: 50 });
  };

  const handleSwipeRight = useCallback((match: MatchResult) => {
    likeUser(match.user_id, {
      onSuccess: (response) => {
        if (response.data.is_mutual) {
          setMutualMatchUser(match.user);
          setShowMutualModal(true);
        }
      },
      onError: (error) => {
        showToast({
          type: 'error',
          message: t('error.likeFailed', 'Failed to send like. Please try again.'),
        });
        console.error('Like failed:', error);
      },
    });
  }, [likeUser, t, showToast]);

  const handleSwipeLeft = useCallback((match: MatchResult) => {
    // Just pass, no action needed
  }, []);

  const handleCardPress = useCallback((match: MatchResult) => {
    setSelectedMatch(match);
    setShowDetailModal(true);
  }, []);

  const handleLikeFromModal = useCallback(() => {
    if (selectedMatch) {
      handleSwipeRight(selectedMatch);
      setShowDetailModal(false);
    }
  }, [selectedMatch, handleSwipeRight]);

  const handleMessageFromModal = useCallback(() => {
    if (selectedMatch) {
      router.push(`/(app)/(chat)/${selectedMatch.user_id}`);
      setShowDetailModal(false);
    }
  }, [selectedMatch, router]);

  const handleSendMessage = useCallback(() => {
    if (mutualMatchUser) {
      const userId = typeof mutualMatchUser.id === 'string'
        ? mutualMatchUser.id
        : (mutualMatchUser as { _id?: string })._id;
      if (userId) {
        router.push(`/(app)/(chat)/${userId}`);
      }
      setShowMutualModal(false);
    }
  }, [mutualMatchUser, router]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
        <LoadingSpinner fullScreen text={t('loading', 'Finding matches...')} />
      </SafeAreaView>
    );
  }

  if (error) {
    // Check for specific error types
    const errorMessage = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || '';
    const errorStatus = (error as { response?: { status?: number } })?.response?.status;
    const isProfileIncomplete = errorMessage.toLowerCase().includes('profile');
    const isRoleError = errorMessage.toLowerCase().includes('tenant') || errorStatus === 403;

    const getErrorContent = () => {
      if (isProfileIncomplete) {
        return {
          title: t('empty.title', 'Complete Your Profile'),
          description: t('empty.description', 'Complete your profile to see compatible flatmates'),
          actionLabel: t('empty.action', 'Complete Profile'),
          onPress: () => router.push('/onboarding/profile-completion/tenant'),
        };
      }
      if (isRoleError) {
        return {
          title: t('error.roleRequired', 'Tenant Role Required'),
          description: t('error.roleDescription', 'You need to be a tenant to find flatmates'),
          actionLabel: t('error.selectRole', 'Select Role'),
          onPress: () => router.push('/onboarding/role'),
        };
      }
      return {
        title: t('error.title', 'Something went wrong'),
        description: t('error.description', 'Unable to load matches. Please try again.'),
        actionLabel: t('error.retry', 'Try Again'),
        onPress: () => refreshMatches(),
      };
    };

    const errorContent = getErrorContent();

    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
        <EmptyState
          icon={<Users size={48} color={colors.muted} />}
          title={errorContent.title}
          description={errorContent.description}
          action={{
            label: errorContent.actionLabel,
            onPress: errorContent.onPress,
          }}
        />
      </SafeAreaView>
    );
  }

  const matches = matchingData?.matches || [];

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3 border-b border-border">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-text">
              {t('title', 'Find Flatmates')}
            </Text>
            <Text className="text-muted">
              {t('subtitle', 'Swipe to find compatible roommates')}
            </Text>
          </View>
          <TouchableOpacity
            className="bg-surface p-3 rounded-lg relative"
            onPress={() => setShowFiltersModal(true)}
          >
            <SlidersHorizontal size={20} color={colors.muted} />
            {activeFilterCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-brand rounded-full w-5 h-5 items-center justify-center">
                <Text className="text-brand-fg text-xs font-bold">{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Matching dashboard (stats + activity shortcuts) */}
      <MatchDashboardCard />

      {/* Swipe Stack */}
      {matches.length > 0 ? (
        <SwipeStack
          matches={matches}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          onCardPress={handleCardPress}
          onRefresh={() => refreshMatches()}
        />
      ) : (
        <EmptyState
          icon={<Users size={48} color={colors.muted} />}
          title={t('empty.title', 'No matches found')}
          description={t('empty.description', 'Complete your profile to see compatible flatmates')}
          action={{
            label: t('empty.action', 'Complete Profile'),
            onPress: () => router.push('/(app)/(profile)/edit'),
          }}
        />
      )}

      {/* Match Detail Modal */}
      <MatchDetailModal
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        match={selectedMatch}
        onLike={handleLikeFromModal}
        onPass={() => setShowDetailModal(false)}
        onMessage={handleMessageFromModal}
      />

      {/* Mutual Match Modal */}
      <MutualMatchModal
        visible={showMutualModal}
        onClose={() => setShowMutualModal(false)}
        user={mutualMatchUser}
        onSendMessage={handleSendMessage}
        onKeepSwiping={() => setShowMutualModal(false)}
      />

      {/* Filters Modal */}
      <MatchFiltersModal
        visible={showFiltersModal}
        onClose={() => setShowFiltersModal(false)}
        filters={filters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />
    </SafeAreaView>
  );
}
