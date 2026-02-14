import { useState, useCallback } from 'react';
import { View, Text, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Users, SlidersHorizontal } from 'lucide-react-native';

import {
  SwipeStack,
  MatchDetailModal,
  MutualMatchModal,
  MatchFiltersModal,
} from '@/components/feature/matching';
import { LoadingSpinner, EmptyState } from '@/components/ui';
import { useMatches, useRefreshMatches } from '@/hooks/matching/useMatching';
import { useLikeUser } from '@/hooks/likes/useLikes';
import type { MatchResult, MatchingFilters } from '@/types/matching.types';
import { COLORS } from '@/lib/constants';

export default function MatchesScreen() {
  const { t } = useTranslation('matching');
  const router = useRouter();

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
        Alert.alert(
          t('error.title', 'Error'),
          t('error.likeFailed', 'Failed to send like. Please try again.')
        );
        console.error('Like failed:', error);
      },
    });
  }, [likeUser, t]);

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
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
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
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <EmptyState
          icon={<Users size={48} color={COLORS.gray[400]} />}
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
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900">
              {t('title', 'Find Flatmates')}
            </Text>
            <Text className="text-gray-500">
              {t('subtitle', 'Swipe to find compatible roommates')}
            </Text>
          </View>
          <TouchableOpacity
            className="bg-gray-100 p-3 rounded-lg relative"
            onPress={() => setShowFiltersModal(true)}
          >
            <SlidersHorizontal size={20} color={COLORS.gray[600]} />
            {activeFilterCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-primary-600 rounded-full w-5 h-5 items-center justify-center">
                <Text className="text-white text-xs font-bold">{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

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
          icon={<Users size={48} color={COLORS.gray[400]} />}
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
