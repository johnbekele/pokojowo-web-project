import { View, Text, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Heart } from 'lucide-react-native';

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
  const { user, compatibility_score, matched_preferences } = match;
  const { colors } = useTheme();

  // Safety check for undefined user
  if (!user) {
    return null;
  }

  const photoUrl = getAvatarUrl(
    user.photo as string | { url?: string } | undefined,
    match.user_id || user.id || user.username
  );

  return (
    <View
      style={[
        {
          width: CARD_WIDTH,
          height: 500,
          borderRadius: 20,
          overflow: 'hidden',
          backgroundColor: colors.card,
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
        resizeMode="cover"
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
      <View className="absolute top-4 right-4 bg-white/90 rounded-full px-3 py-1.5 flex-row items-center">
        <Heart size={16} color={colors.brand} fill={colors.brand} />
        <Text className="text-brand font-bold ml-1">
          {Math.round(compatibility_score)}%
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
        {matched_preferences && matched_preferences.length > 0 && (
          <View className="flex-row flex-wrap gap-2">
            {matched_preferences.slice(0, 3).map((pref, idx) => (
              <Badge key={idx} variant="primary" size="sm">
                {pref}
              </Badge>
            ))}
            {matched_preferences.length > 3 && (
              <Badge variant="default" size="sm">
                +{matched_preferences.length - 3}
              </Badge>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
