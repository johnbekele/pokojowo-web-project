import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MapPin, MessageSquare, Handshake } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, Badge, Button } from '@/components/ui';
import { useLikeUser } from '@/hooks/likes/useLikes';
import type { Like, MutualMatch } from '@/types/matching.types';
import type { User } from '@/types/user.types';
import { COLORS } from '@/lib/constants';

interface LikeCardProps {
  like?: Like;
  match?: MutualMatch;
  type: 'received' | 'sent' | 'mutual';
  onLikeBack?: () => void;
}

export default function LikeCard({ like, match, type, onLikeBack }: LikeCardProps) {
  const { t } = useTranslation('matching');
  const router = useRouter();
  const { mutate: likeUser, isPending: isLiking } = useLikeUser();

  const user = like?.user || match?.user;
  const userId = type === 'received' ? like?.liker_id : (like?.liked_user_id || match?.user_id);
  const compatibilityScore = like?.compatibility_score || match?.compatibility_score;
  const timestamp = like?.created_at || match?.matched_at;
  const isPending = like?.status === 'pending';
  const isMutual = like?.status === 'mutual' || type === 'mutual';

  if (!user || !userId) return null;

  const handleLikeBack = () => {
    likeUser(userId, {
      onSuccess: () => onLikeBack?.(),
      onError: () => {
        Alert.alert(
          t('error.title', 'Error'),
          t('error.likeFailed', 'Failed to send like. Please try again.')
        );
      },
    });
  };

  const handleViewProfile = () => {
    router.push(`/(app)/(matches)/profile/${userId}`);
  };

  const handleChat = () => {
    router.push(`/(app)/(chat)/${userId}`);
  };

  const getTimeText = () => {
    if (!timestamp) return '';
    const timeAgo = formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    if (type === 'received') return t('likes.received.likedYou', { time: timeAgo });
    if (type === 'sent') return t('likes.sent.liked', { time: timeAgo });
    return t('likes.mutual.matched', { time: timeAgo });
  };

  const cardStyle = isMutual
    ? 'bg-gradient-to-br from-primary-50 to-emerald-50 border-2 border-primary-400'
    : isPending
    ? 'bg-amber-50 border-2 border-amber-400'
    : 'bg-white border border-gray-200';

  return (
    <View className={`rounded-xl overflow-hidden ${cardStyle}`}>
      {/* Header */}
      <View className="p-4">
        <View className="flex-row items-center">
          <Avatar
            source={typeof (user as User).photo === 'string' ? (user as User).photo as string : ((user as User).photo as { url?: string } | undefined)?.url || null}
            name={`${(user as User).firstname || ''} ${(user as User).lastname || ''}`}
            size="lg"
          />
          <View className="flex-1 ml-3">
            <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>
              {(user as User).firstname} {(user as User).lastname}
            </Text>
            {(user as User).location && (
              <View className="flex-row items-center mt-1">
                <MapPin size={12} color={COLORS.gray[400]} />
                <Text className="text-sm text-gray-500 ml-1" numberOfLines={1}>
                  {(user as User).location}
                </Text>
              </View>
            )}
          </View>
          {compatibilityScore && (
            <Badge variant={isMutual ? 'success' : 'default'}>
              {Math.round(compatibilityScore)}%
            </Badge>
          )}
          {isMutual && (
            <View className="ml-2 bg-primary-500 rounded-full p-1.5">
              <Handshake size={14} color="white" />
            </View>
          )}
        </View>
      </View>

      {/* Bio */}
      {(user as User).bio && (
        <View className="px-4 pb-3">
          <Text className="text-sm text-gray-600" numberOfLines={2}>
            {(user as User).bio}
          </Text>
        </View>
      )}

      {/* Timestamp */}
      <View className="px-4 pb-3">
        <Text className="text-xs text-gray-400">{getTimeText()}</Text>
      </View>

      {/* Actions */}
      <View className="flex-row gap-2 p-3 border-t border-gray-100">
        {type === 'received' && !isMutual && (
          <Button
            variant="primary"
            className="flex-1"
            onPress={handleLikeBack}
            disabled={isLiking}
          >
            {t('likes.likeBack', 'Like Back')}
          </Button>
        )}
        <TouchableOpacity
          onPress={handleViewProfile}
          className="flex-1 border border-gray-300 rounded-lg py-2.5 items-center"
        >
          <Text className="text-gray-700 font-medium">
            {t('card.viewProfile', 'View Profile')}
          </Text>
        </TouchableOpacity>
        {isMutual && (
          <TouchableOpacity
            onPress={handleChat}
            className="bg-primary-500 rounded-lg py-2.5 px-4 flex-row items-center justify-center"
          >
            <MessageSquare size={16} color="white" />
            <Text className="text-white font-medium ml-2">
              {t('card.chat', 'Chat')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
