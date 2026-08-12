import { View, Text, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Heart, ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui';
import type { MatchResult } from '@/types/matching.types';
import useTheme from '@/hooks/useTheme';
import { getAvatarUrl } from '@/lib/image';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;

interface SwipeCardProps {
  match: MatchResult;
  style?: object;
}

export default function SwipeCard({ match, style }: SwipeCardProps) {
  const { user, compatibility_score, matched_preferences, shared_interests, match_tier } = match;
  const { colors } = useTheme();
  const { t } = useTranslation('matching');

  // Safety check for undefined user
  if (!user) {
    return null;
  }

  const photoUrl = getAvatarUrl(
    user.photo as string | { url?: string } | undefined,
    match.user_id || user.id || user.username
  );

  const score = Math.max(0, Math.min(100, Math.round(compatibility_score || 0)));
  const scoreColor = score >= 80 ? colors.success : score >= 60 ? colors.brand : colors.warning;
  const interests = matched_preferences?.length ? matched_preferences : shared_interests;

  return (
    <View
      style={[
        {
          width: CARD_WIDTH,
          height: 500,
          borderRadius: 20,
          overflow: 'hidden',
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
        },
        style,
      ]}
    >
      {/* Image */}
        <Image
          source={{ uri: photoUrl }}
          style={{ width: '100%', height: '60%' }}
          contentFit="cover"
          transition={180}
          accessibilityRole="image"
          accessibilityLabel={t('accessibility.profilePhoto', 'Profile photo of {{name}}', {
            name: user.firstname || user.username || t('detail.unknown', 'Unknown'),
          })}
        />

      {/* Gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: '40%',
          height: 100,
        }}
      />

      {/* Compatibility badge */}
      <View
        className="absolute right-4 top-4 h-[68px] w-[68px] items-center justify-center rounded-full bg-card/95"
        style={{ borderColor: scoreColor, borderWidth: 4 }}
      >
        <Heart size={15} color={scoreColor} fill={scoreColor} />
        <Text className="font-bold" style={{ color: scoreColor }}>
          {score}%
        </Text>
      </View>

      {/* Content */}
      <View className="flex-1 p-4">
        {/* Name and age */}
        <View className="flex-row items-center mb-2">
          <Text className="text-2xl font-bold text-text">
            {user.firstname || user.username}
          </Text>
          {user.age && (
            <Text className="text-xl text-muted ml-2">{user.age}</Text>
          )}
        </View>

        {/* Location */}
        {user.location && (
          <View className="flex-row items-center mb-3">
            <MapPin size={16} color={colors.muted} />
            <Text className="text-muted ml-1">{user.location}</Text>
          </View>
        )}

        {/* Bio */}
        {user.bio && (
          <Text className="text-muted mb-3" numberOfLines={2}>
            {user.bio}
          </Text>
        )}

        {/* Matched preferences */}
        <View className="mb-3 flex-row items-center gap-2">
          <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
            <View className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: scoreColor }} />
          </View>
          <Text className="text-xs font-semibold text-muted">{score}%</Text>
        </View>

        {interests && interests.length > 0 && (
          <View className="flex-row flex-wrap gap-2">
            {interests.slice(0, 3).map((pref, idx) => (
              <Badge key={idx} variant="primary" size="sm">
                {pref}
              </Badge>
            ))}
            {interests.length > 3 && (
              <Badge variant="default" size="sm">
                +{interests.length - 3}
              </Badge>
            )}
          </View>
        )}
        {(match_tier || match.trust_level === 'verified' || match.trust_level === 'id_verified') && (
          <View className="mt-3 flex-row items-center gap-1">
            <ShieldCheck size={14} color={colors.success} />
            <Text className="text-xs font-medium text-muted">
              {match_tier ||
                (match.trust_level === 'id_verified'
                  ? t('card.idVerified', 'ID verified')
                  : t('card.verified', 'Verified'))}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
