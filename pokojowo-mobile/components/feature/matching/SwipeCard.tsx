import { View, Text, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Heart } from 'lucide-react-native';

import { Badge } from '@/components/ui';
import type { MatchResult } from '@/types/matching.types';
import { COLORS } from '@/lib/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;

interface SwipeCardProps {
  match: MatchResult;
  style?: object;
}

export default function SwipeCard({ match, style }: SwipeCardProps) {
  const { user, compatibility_score, matched_preferences } = match;

  const photoUrl = typeof user.photo === 'string'
    ? user.photo
    : (user.photo as { url?: string } | undefined)?.url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400';

  return (
    <View
      style={[
        {
          width: CARD_WIDTH,
          height: 500,
          borderRadius: 20,
          overflow: 'hidden',
          backgroundColor: 'white',
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
        <Heart size={16} color={COLORS.primary[600]} fill={COLORS.primary[600]} />
        <Text className="text-primary-600 font-bold ml-1">
          {Math.round(compatibility_score)}%
        </Text>
      </View>

      {/* Content */}
      <View className="flex-1 p-4">
        {/* Name and age */}
        <View className="flex-row items-center mb-2">
          <Text className="text-2xl font-bold text-gray-900">
            {user.firstname || user.username}
          </Text>
          {user.age && (
            <Text className="text-xl text-gray-500 ml-2">{user.age}</Text>
          )}
        </View>

        {/* Location */}
        {user.location && (
          <View className="flex-row items-center mb-3">
            <MapPin size={16} color={COLORS.gray[500]} />
            <Text className="text-gray-500 ml-1">{user.location}</Text>
          </View>
        )}

        {/* Bio */}
        {user.bio && (
          <Text className="text-gray-600 mb-3" numberOfLines={2}>
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
