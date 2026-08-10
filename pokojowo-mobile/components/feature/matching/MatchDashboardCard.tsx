import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Heart, Users, Clock, Bookmark, ChevronRight, Sparkles } from 'lucide-react-native';

import { useMatchingDashboard } from '@/hooks/matching/useMatching';
import useTheme from '@/hooks/useTheme';
import { Avatar, Badge } from '@/components/ui';
import { getAvatarUrl } from '@/lib/image';

interface StatPillProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  onPress?: () => void;
}

function StatPill({ icon, value, label, onPress }: StatPillProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      className="flex-row items-center gap-2 bg-surface border border-border rounded-full px-3 py-2 mr-2"
    >
      {icon}
      <Text className="text-text font-bold">{value}</Text>
      <Text className="text-muted text-xs">{label}</Text>
    </TouchableOpacity>
  );
}

/**
 * Compact matching-dashboard strip shown above the swipe deck. Surfaces the
 * activity counts the backend already computes (GET /matching/dashboard) and
 * links into the full likes/matches screen.
 */
export default function MatchDashboardCard() {
  const { t } = useTranslation('matching');
  const { colors } = useTheme();
  const router = useRouter();
  const { data, isLoading } = useMatchingDashboard();

  if (isLoading || !data?.stats) return null;

  const stats = data.stats;
  const goToLikes = () => router.push('/(app)/(profile)/likes');
  const goToSaved = () => router.push('/(app)/(profile)/favorites');
  const topMatch = data.previews?.top_matches?.[0];
  const topMatchId =
    topMatch?.user_id || topMatch?.user?.id || (topMatch?.user as { _id?: string } | undefined)?._id;
  const topMatchName = topMatch?.user?.firstname || topMatch?.user?.username;

  return (
    <View className="px-4 pt-3 pb-1">
      {!data.profile_complete && (
        <TouchableOpacity
          onPress={() => router.push('/onboarding/profile-completion/tenant')}
          activeOpacity={0.8}
          className="flex-row items-center justify-between bg-brand/10 border border-brand/30 rounded-xl px-4 py-3 mb-3"
        >
          <Text className="flex-1 text-text text-sm">
            {t('dashboard.completeProfile', 'Complete your profile for better matches')}
          </Text>
          <ChevronRight size={18} color={colors.brand} />
        </TouchableOpacity>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center' }}
      >
        <StatPill
          icon={<Heart size={16} color={colors.brand} fill={colors.brand} />}
          value={stats.likes_received}
          label={t('dashboard.likesReceived', 'likes')}
          onPress={goToLikes}
        />
        <StatPill
          icon={<Users size={16} color={colors.success} />}
          value={stats.mutual_matches}
          label={t('dashboard.matches', 'matches')}
          onPress={goToLikes}
        />
        <StatPill
          icon={<Clock size={16} color={colors.warning} />}
          value={stats.pending_likes}
          label={t('dashboard.pending', 'pending')}
          onPress={goToLikes}
        />
        {stats.saved_matches > 0 && (
          <StatPill
            icon={<Bookmark size={16} color={colors.info} />}
            value={stats.saved_matches}
            label={t('dashboard.saved', 'saved')}
            onPress={goToLikes}
          />
        )}
      </ScrollView>

      <View className="mt-3 flex-row gap-2">
        {topMatch && topMatchId && (
          <TouchableOpacity
            onPress={() => router.push(`/(app)/(matches)/profile/${topMatchId}`)}
            activeOpacity={0.8}
            className="flex-1 flex-row items-center rounded-xl border border-border bg-card px-3 py-3"
            accessibilityRole="button"
            accessibilityLabel={t('dashboard.topMatches.open', 'Open your top match')}
          >
            <Avatar
              source={getAvatarUrl(topMatch.user?.photo as string | { url?: string } | undefined, topMatchId)}
              name={topMatchName || t('dashboard.unknownLocation', 'Top match')}
              size="sm"
            />
            <View className="ml-2 flex-1">
              <Text className="text-xs text-muted">{t('dashboard.topMatches.title', 'Top match')}</Text>
              <Text className="font-semibold text-text" numberOfLines={1}>
                {topMatchName || t('dashboard.unknownLocation', 'Potential flatmate')}
              </Text>
            </View>
            <Badge variant="primary" size="sm">
              {Math.round(topMatch.compatibility_score)}%
            </Badge>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={goToSaved}
          activeOpacity={0.8}
          className="min-w-[112px] flex-row items-center justify-center rounded-xl border border-border bg-card px-3 py-3"
          accessibilityRole="button"
          accessibilityLabel={t('dashboard.quickActions.savedProfiles', 'Saved profiles')}
        >
          <Sparkles size={17} color={colors.info} />
          <View className="ml-2">
            <Text className="text-xs text-muted">{t('dashboard.saved', 'saved')}</Text>
            <Text className="font-semibold text-text">{stats.saved_matches}</Text>
          </View>
          <ChevronRight size={16} color={colors.muted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
