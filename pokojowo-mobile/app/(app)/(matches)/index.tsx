import { useState, useCallback } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react-native';

import { SwipeStack, MatchDetailModal, MutualMatchModal } from '@/components/feature/matching';
import { LoadingSpinner, EmptyState } from '@/components/ui';
import { useMatches, useRefreshMatches } from '@/hooks/matching/useMatching';
import { useLikeUser } from '@/hooks/likes/useLikes';
import { useChatWithUser } from '@/hooks/chat/useChat';
import type { MatchResult } from '@/types/matching.types';
import { COLORS } from '@/lib/constants';

export default function MatchesScreen() {
  const { t } = useTranslation('matching');
  const router = useRouter();

  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);
  const [mutualMatchUser, setMutualMatchUser] = useState<MatchResult['user'] | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showMutualModal, setShowMutualModal] = useState(false);

  const { data: matchingData, isLoading, error } = useMatches({ limit: 50 });
  const { mutate: refreshMatches, isPending: isRefreshing } = useRefreshMatches();
  const { mutate: likeUser } = useLikeUser();

  const handleSwipeRight = useCallback((match: MatchResult) => {
    likeUser(match.user_id, {
      onSuccess: (response) => {
        if (response.data.is_mutual) {
          setMutualMatchUser(match.user);
          setShowMutualModal(true);
        }
      },
    });
  }, [likeUser]);

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
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <EmptyState
          icon={<Users size={48} color={COLORS.gray[400]} />}
          title={t('error.title', 'Something went wrong')}
          description={t('error.description', 'Unable to load matches. Please try again.')}
          action={{
            label: t('error.retry', 'Try Again'),
            onPress: () => refreshMatches(),
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
        <Text className="text-2xl font-bold text-gray-900">
          {t('title', 'Find Flatmates')}
        </Text>
        <Text className="text-gray-500">
          {t('subtitle', 'Swipe to find compatible roommates')}
        </Text>
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
    </SafeAreaView>
  );
}
