import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Users, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import useAuthStore from '@/stores/authStore';
import type { LikesStats as LikesStatsType } from '@/types/matching.types';
import { COLORS } from '@/lib/constants';

interface LikesStatsProps {
  stats?: LikesStatsType;
  isLoading?: boolean;
}

export default function LikesStats({ stats, isLoading }: LikesStatsProps) {
  const { t } = useTranslation('matching');
  const router = useRouter();
  const { user } = useAuthStore();

  const displayName = user?.firstname || user?.username || t('likes.defaultUser', 'User');

  const statItems = [
    { value: stats?.likes_received ?? 0, label: t('likes.stats.likesReceived', 'Received') },
    { value: stats?.likes_sent ?? 0, label: t('likes.stats.likesSent', 'Sent') },
    { value: stats?.mutual_matches ?? 0, label: t('likes.stats.mutualMatches', 'Mutual') },
    { value: stats?.pending_likes ?? 0, label: t('likes.stats.pending', 'Pending'), showBadge: true },
  ];

  return (
    <LinearGradient
      colors={[COLORS.primary[500], '#10b981']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      className="mx-4 rounded-xl p-5"
    >
      {/* Welcome Header */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-1">
          <Text className="text-2xl font-bold text-white">
            {t('likes.welcome', 'Welcome, {{name}}!', { name: displayName })}
          </Text>
          <Text className="text-white/80 text-sm mt-0.5">
            {t('likes.subtitle', 'Your connections and matches')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(app)/(matches)')}
          className="bg-white/20 rounded-lg px-3 py-2 flex-row items-center"
        >
          <Sparkles size={16} color="white" />
          <Text className="text-white font-medium ml-1.5 text-sm">
            {t('likes.findMore', 'Find More')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats Grid */}
      <View className="flex-row flex-wrap gap-3">
        {statItems.map((item, index) => (
          <View
            key={index}
            className="flex-1 min-w-[45%] bg-white/20 rounded-lg p-3 items-center relative"
          >
            {isLoading ? (
              <View className="h-8 w-12 bg-white/30 rounded animate-pulse" />
            ) : (
              <Text className="text-2xl font-bold text-white">{item.value}</Text>
            )}
            <Text className="text-sm text-white/90 mt-1">{item.label}</Text>
            {item.showBadge && (item.value ?? 0) > 0 && (
              <View className="absolute top-1 right-1 h-2.5 w-2.5 bg-amber-400 rounded-full" />
            )}
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}
