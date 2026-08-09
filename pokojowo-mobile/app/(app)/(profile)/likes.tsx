import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ArrowRight,
  Handshake,
  ChevronLeft,
} from 'lucide-react-native';
import {
  useLikesSent,
  useLikesReceived,
  useMutualMatches,
  useLikesStats,
} from '@/hooks/likes/useLikes';
import { LikeCard, LikesStats } from '@/components/feature/likes';
import { EmptyState } from '@/components/ui';
import { COLORS } from '@/lib/constants';
import type { Like, MutualMatch } from '@/types/matching.types';

type TabType = 'received' | 'sent' | 'mutual';

type LikeListRow =
  | { kind: 'heading'; id: string; title: string; pending?: boolean }
  | { kind: 'like'; id: string; like: Like; type: 'received' | 'sent' }
  | { kind: 'mutual'; id: string; match: MutualMatch };

export default function LikesScreen() {
  const { t } = useTranslation('matching');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('received');

  const { data: stats, isLoading: statsLoading } = useLikesStats();
  const {
    data: receivedData,
    isLoading: receivedLoading,
    refetch: refetchReceived,
    isRefetching: isRefetchingReceived,
  } = useLikesReceived();
  const {
    data: sentData,
    isLoading: sentLoading,
    refetch: refetchSent,
    isRefetching: isRefetchingSent,
  } = useLikesSent();
  const {
    data: mutualData,
    isLoading: mutualLoading,
    refetch: refetchMutual,
    isRefetching: isRefetchingMutual,
  } = useMutualMatches();

  const likesReceived = receivedData?.likes ?? [];
  const likesSent = sentData?.likes ?? [];
  const mutualMatches = mutualData?.mutual_matches ?? [];

  const pendingLikesReceived = likesReceived.filter(
    (l) => l.status === 'pending',
  );
  const handledLikesReceived = likesReceived.filter(
    (l) => l.status !== 'pending',
  );

  const isLoading = receivedLoading || sentLoading || mutualLoading;
  const isRefetching =
    isRefetchingReceived || isRefetchingSent || isRefetchingMutual;

  const onRefresh = useCallback(() => {
    refetchReceived();
    refetchSent();
    refetchMutual();
  }, [refetchReceived, refetchSent, refetchMutual]);

  const tabs = [
    {
      key: 'received' as TabType,
      label: t('likes.tabs.received', 'Received'),
      icon: ArrowLeft,
      badge: stats?.pending_likes,
    },
    {
      key: 'sent' as TabType,
      label: t('likes.tabs.sent', 'Sent'),
      icon: ArrowRight,
    },
    {
      key: 'mutual' as TabType,
      label: t('likes.tabs.mutual', 'Mutual'),
      icon: Handshake,
      badge: stats?.mutual_matches,
      badgeGradient: true,
    },
  ];

  const rows = useMemo<LikeListRow[]>(() => {
    if (activeTab === 'received') {
      return [
        ...(pendingLikesReceived.length > 0
          ? [
              {
                kind: 'heading' as const,
                id: 'pending-heading',
                title: t(
                  'likes.received.waitingForResponse',
                  'Waiting for your response',
                ),
                pending: true,
              },
            ]
          : []),
        ...pendingLikesReceived.map((like) => ({
          kind: 'like' as const,
          id: `received-${like._id}`,
          like,
          type: 'received' as const,
        })),
        ...(handledLikesReceived.length > 0
          ? [
              {
                kind: 'heading' as const,
                id: 'all-received-heading',
                title: t('likes.received.allLikes', 'All received likes'),
              },
            ]
          : []),
        ...handledLikesReceived.map((like) => ({
          kind: 'like' as const,
          id: `received-${like._id}`,
          like,
          type: 'received' as const,
        })),
      ];
    }

    if (activeTab === 'sent') {
      return likesSent.map((like) => ({
        kind: 'like' as const,
        id: `sent-${like._id}`,
        like,
        type: 'sent' as const,
      }));
    }

    return mutualMatches.map((match) => ({
      kind: 'mutual' as const,
      id: `mutual-${match.id || match._id || match.matched_user_id}`,
      match,
    }));
  }, [
    activeTab,
    handledLikesReceived,
    likesSent,
    mutualMatches,
    pendingLikesReceived,
    t,
  ]);

  const emptyState = () => {
    switch (activeTab) {
      case 'received':
        return (
          <EmptyState
            icon="heart"
            title={t('likes.received.empty.title', 'No likes yet')}
            description={t(
              'likes.received.empty.subtitle',
              'When someone likes you, they will appear here',
            )}
          />
        );
      case 'sent':
        return (
          <EmptyState
            icon="send"
            title={t('likes.sent.empty.title', 'No likes sent')}
            description={t(
              'likes.sent.empty.subtitle',
              'Start swiping to find your match!',
            )}
            action={{
              label: t('likes.sent.browseMatches', 'Browse Matches'),
              onPress: () => router.push('/(app)/(matches)'),
            }}
          />
        );
      default:
        return (
          <EmptyState
            icon="heart"
            title={t('likes.mutual.empty.title', 'No mutual matches yet')}
            description={t(
              'likes.mutual.empty.subtitle',
              "When you and someone both like each other, it's a match!",
            )}
            action={{
              label: t('likes.mutual.findMatches', 'Find Matches'),
              onPress: () => router.push('/(app)/(matches)'),
            }}
          />
        );
    }
  };

  const listHeader = (
    <>
      <View className="py-4">
        <LikesStats stats={stats} isLoading={statsLoading} />
      </View>

      <View className="flex-row mx-4 mb-4 bg-gray-100 rounded-xl p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg ${
                isActive ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Icon
                size={16}
                color={isActive ? COLORS.primary[600] : COLORS.gray[500]}
              />
              <Text
                className={`ml-1.5 font-medium ${
                  isActive ? 'text-primary-600' : 'text-gray-500'
                }`}
              >
                {tab.label}
              </Text>
              {tab.badge && tab.badge > 0 && (
                <View
                  className={`ml-1.5 px-1.5 py-0.5 rounded-full ${
                    tab.badgeGradient ? 'bg-primary-500' : 'bg-amber-500'
                  }`}
                >
                  <Text className="text-xs text-white font-bold">
                    {tab.badge}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  const renderRow = ({ item }: { item: LikeListRow }) => {
    if (item.kind === 'heading') {
      return item.pending ? (
        <View className="px-4 mb-3">
          <View className="flex-row items-center gap-2">
            <View className="h-2 w-2 bg-amber-500 rounded-full" />
            <Text className="text-base font-semibold text-gray-900">
              {item.title}
            </Text>
          </View>
        </View>
      ) : (
        <View className="px-4 mb-3">
          <Text className="text-base font-semibold text-gray-900">
            {item.title}
          </Text>
        </View>
      );
    }

    return (
      <View className="px-4 mb-3">
        {item.kind === 'mutual' ? (
          <LikeCard match={item.match} type="mutual" />
        ) : (
          <LikeCard like={item.like} type={item.type} onLikeBack={onRefresh} />
        )}
      </View>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color={COLORS.primary[600]} />
        </View>
      );
    }

    return (
      <FlashList
        data={rows}
        keyExtractor={(item) => item.id}
        renderItem={renderRow}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyState()}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={COLORS.primary[600]}
          />
        }
      />
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color={COLORS.gray[700]} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">
          {t('likes.pageTitle', 'Likes & Matches')}
        </Text>
      </View>

      <View className="flex-1">{renderContent()}</View>
    </SafeAreaView>
  );
}
