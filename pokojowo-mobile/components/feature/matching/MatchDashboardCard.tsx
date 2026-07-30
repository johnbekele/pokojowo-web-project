import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Heart, Users, Clock, Bookmark, ChevronRight } from 'lucide-react-native';

import { useDashboard } from '@/hooks/matching/useMatching';
import useTheme from '@/hooks/useTheme';

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
  const { data, isLoading } = useDashboard();

  if (isLoading || !data?.stats) return null;

  const stats = data.stats;
  const goToLikes = () => router.push('/(app)/(profile)/likes');

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
    </View>
  );
}
