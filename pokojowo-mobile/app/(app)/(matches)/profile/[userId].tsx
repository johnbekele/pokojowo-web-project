import { View, Text, Image, ScrollView, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Heart, MapPin, MessageSquare, ChevronLeft, Check, AlertCircle } from 'lucide-react-native';

import { Button, Badge, EmptyState } from '@/components/ui';
import { useMatchWithUser } from '@/hooks/matching/useMatching';
import { useLikeUser, useLikeStatus } from '@/hooks/likes/useLikes';
import { COLORS } from '@/lib/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MatchProfileScreen() {
  const { t } = useTranslation('matching');
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const { data: matchData, isLoading, error } = useMatchWithUser(userId || '');
  const { data: likeStatus } = useLikeStatus(userId || '');
  const { mutate: likeUser, isPending: isLiking } = useLikeUser();

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
      router.push(`/(app)/(chat)/${userId}`);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary[600]} />
      </SafeAreaView>
    );
  }

  if (error || !matchData) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ChevronLeft size={24} color={COLORS.gray[700]} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">
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

  const { user, compatibility_score, score_breakdown, matched_preferences, potential_issues } = matchData;

  const photoUrl = typeof user?.photo === 'string'
    ? user.photo
    : (user?.photo as { url?: string } | undefined)?.url;

  const isLiked = likeStatus?.i_liked || false;
  const isMutual = likeStatus?.is_mutual || false;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="absolute top-12 left-4 z-10">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/90 items-center justify-center shadow-lg"
        >
          <ChevronLeft size={24} color={COLORS.gray[700]} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header image */}
        <View className="relative">
          {photoUrl ? (
            <Image
              source={{ uri: photoUrl }}
              style={{ width: SCREEN_WIDTH, height: 350 }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{ width: SCREEN_WIDTH, height: 350 }}
              className="bg-primary-100 items-center justify-center"
            >
              <Text className="text-primary-600 text-6xl font-bold">
                {user?.firstname?.charAt(0) || user?.username?.charAt(0) || '?'}
              </Text>
            </View>
          )}

          {/* Compatibility badge */}
          {compatibility_score && (
            <View className="absolute bottom-4 right-4 bg-white rounded-full px-4 py-2 flex-row items-center shadow-lg">
              <Heart size={20} color={COLORS.primary[600]} fill={COLORS.primary[600]} />
              <Text className="text-primary-600 font-bold text-lg ml-2">
                {Math.round(compatibility_score)}% {t('score.label', 'Match')}
              </Text>
            </View>
          )}
        </View>

        <View className="p-4">
          {/* Name and basic info */}
          <View className="mb-4">
            <View className="flex-row items-center">
              <Text className="text-2xl font-bold text-gray-900">
                {user?.firstname || user?.username || t('detail.unknown', 'Unknown')}
              </Text>
              {user?.age && (
                <Text className="text-xl text-gray-500 ml-2">{user.age}</Text>
              )}
              {isMutual && (
                <Badge variant="success" className="ml-2">
                  {t('likes.mutual.matchBadge', 'Mutual')}
                </Badge>
              )}
            </View>
            {user?.location && (
              <View className="flex-row items-center mt-1">
                <MapPin size={16} color={COLORS.gray[500]} />
                <Text className="text-gray-500 ml-1">{user.location}</Text>
              </View>
            )}
          </View>

          {/* Bio */}
          {user?.bio && (
            <View className="mb-6">
              <Text className="text-base font-semibold text-gray-900 mb-2">
                {t('detail.about', 'About')}
              </Text>
              <Text className="text-gray-600 leading-6">{user.bio}</Text>
            </View>
          )}

          {/* Compatibility breakdown */}
          {score_breakdown && (
            <View className="mb-6">
              <Text className="text-base font-semibold text-gray-900 mb-3">
                {t('detail.compatibility', 'Compatibility Breakdown')}
              </Text>
              <View className="bg-gray-50 rounded-xl p-4">
                {Object.entries(score_breakdown).map(([key, value]) => (
                  <View key={key} className="mb-3 last:mb-0">
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-gray-700 capitalize">
                        {t(`breakdown.${key}`, key.replace('_', ' '))}
                      </Text>
                      <Text className="text-gray-900 font-medium">
                        {Math.round(value as number)}%
                      </Text>
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
                {t('detail.sharedInterests', 'You both share')}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {matched_preferences.map((pref: string, idx: number) => (
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
                {t('detail.thingsToConsider', 'Things to consider')}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {potential_issues.map((issue: string, idx: number) => (
                  <View key={idx} className="flex-row items-center bg-yellow-50 rounded-full px-3 py-1.5">
                    <AlertCircle size={14} color={COLORS.warning} />
                    <Text className="text-yellow-700 ml-1.5 font-medium">{issue}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Bottom padding for action buttons */}
          <View className="h-24" />
        </View>
      </ScrollView>

      {/* Action buttons */}
      <View className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between p-4 border-t border-gray-100 bg-white">
        {isMutual ? (
          <Button
            onPress={handleMessage}
            variant="primary"
            className="flex-1"
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
              icon={<MessageSquare size={20} color={COLORS.gray[700]} />}
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
