import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Handshake, ChevronLeft } from 'lucide-react-native';
import {
  useLikesSent,
  useLikesReceived,
  useMutualMatches,
  useLikesStats,
} from '@/hooks/likes/useLikes';
import { LikeCard, LikesStats } from '@/components/feature/likes';
import { EmptyState } from '@/components/ui';
import { COLORS } from '@/lib/constants';

type TabType = 'received' | 'sent' | 'mutual';

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

  const pendingLikesReceived = likesReceived.filter((l) => l.status === 'pending');

  const isLoading = receivedLoading || sentLoading || mutualLoading;
  const isRefetching = isRefetchingReceived || isRefetchingSent || isRefetchingMutual;

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

  const renderContent = () => {
    if (isLoading) {
      return (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color={COLORS.primary[600]} />
        </View>
      );
    }

    switch (activeTab) {
      case 'received':
        if (likesReceived.length === 0) {
          return (
            <EmptyState
              icon="heart"
              title={t('likes.received.empty.title', 'No likes yet')}
              description={t(
                'likes.received.empty.subtitle',
                'When someone likes you, they will appear here'
              )}
            />
          );
        }
        return (
          <View className="px-4 gap-4">
            {pendingLikesReceived.length > 0 && (
              <View className="mb-2">
                <View className="flex-row items-center gap-2 mb-3">
                  <View className="h-2 w-2 bg-amber-500 rounded-full" />
                  <Text className="text-base font-semibold text-gray-900">
                    {t('likes.received.waitingForResponse', 'Waiting for your response')}
                  </Text>
                </View>
                {pendingLikesReceived.map((like) => (
                  <LikeCard
                    key={like._id}
                    like={like}
                    type="received"
                    onLikeBack={onRefresh}
                  />
                ))}
              </View>
            )}
            {likesReceived.filter((l) => l.status !== 'pending').length > 0 && (
              <View>
                <Text className="text-base font-semibold text-gray-900 mb-3">
                  {t('likes.received.allLikes', 'All received likes')}
                </Text>
                {likesReceived
                  .filter((l) => l.status !== 'pending')
                  .map((like) => (
                    <View key={like._id} className="mb-3">
                      <LikeCard like={like} type="received" onLikeBack={onRefresh} />
                    </View>
                  ))}
              </View>
            )}
          </View>
        );

      case 'sent':
        if (likesSent.length === 0) {
          return (
            <EmptyState
              icon="send"
              title={t('likes.sent.empty.title', 'No likes sent')}
              description={t('likes.sent.empty.subtitle', 'Start swiping to find your match!')}
              action={{
                label: t('likes.sent.browseMatches', 'Browse Matches'),
                onPress: () => router.push('/(app)/(matches)'),
              }}
            />
          );
        }
        return (
          <View className="px-4 gap-3">
            {likesSent.map((like) => (
              <LikeCard key={like._id} like={like} type="sent" />
            ))}
          </View>
        );

      case 'mutual':
        if (mutualMatches.length === 0) {
          return (
            <EmptyState
              icon="heart"
              title={t('likes.mutual.empty.title', 'No mutual matches yet')}
              description={t(
                'likes.mutual.empty.subtitle',
                "When you and someone both like each other, it's a match!"
              )}
              action={{
                label: t('likes.mutual.findMatches', 'Find Matches'),
                onPress: () => router.push('/(app)/(matches)'),
              }}
            />
          );
        }
        return (
          <View className="px-4 gap-3">
            {mutualMatches.map((match) => (
              <LikeCard key={match._id} match={match} type="mutual" />
            ))}
          </View>
        );
    }
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

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={COLORS.primary[600]}
          />
        }
      >
        {/* Stats Header */}
        <View className="py-4">
          <LikesStats stats={stats} isLoading={statsLoading} />
        </View>

        {/* Tabs */}
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
                    <Text className="text-xs text-white font-bold">{tab.badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Content */}
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}
