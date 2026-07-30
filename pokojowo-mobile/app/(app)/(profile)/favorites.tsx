import { View, Text, RefreshControl, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Heart } from 'lucide-react-native';

import { Avatar, LoadingSpinner, EmptyState, Card, Badge } from '@/components/ui';
import { useSavedUsers } from '@/hooks/favorites/useFavorites';
import type { FavoriteUser } from '@/services/favorites.service';
import useTheme from '@/hooks/useTheme';
import { getImageUrl } from '@/lib/image';
import { formatRelativeTime } from '@/lib/utils';

export default function FavoritesScreen() {
  const { t } = useTranslation('profile');
  const router = useRouter();
  const { colors } = useTheme();

  const { data, isLoading, isRefetching, refetch } = useSavedUsers();

  const savedUsers = data?.saved_users || [];

  const renderItem = ({ item }: { item: FavoriteUser }) => {
    const photoUrl = item.user.photo ? getImageUrl(item.user.photo) : null;

    const displayName = item.user.firstname
      ? `${item.user.firstname} ${item.user.lastname || ''}`.trim()
      : item.user.username || 'Unknown';

    const userId = item.user.id || (item.user as { _id?: string })._id;

    return (
      <Card
        variant="elevated"
        padding="md"
        className="mx-4 mb-3"
        onPress={() => {
          if (userId) router.push(`/(app)/(matches)/profile/${userId}`);
        }}
      >
        <View className="flex-row items-center">
          <Avatar
            source={photoUrl}
            name={displayName}
            size="lg"
          />
          <View className="flex-1 ml-3">
            <Text className="text-base font-semibold text-text">
              {displayName}
            </Text>
            {item.user.location && (
              <Text className="text-sm text-muted">{item.user.location}</Text>
            )}
            <Text className="text-xs text-muted mt-1">
              {t('favorites.savedAt', 'Saved {{time}}', {
                time: formatRelativeTime(item.saved_at),
              })}
            </Text>
          </View>
          <Heart size={20} color={colors.brand} fill={colors.brand} />
        </View>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <LoadingSpinner fullScreen text={t('favorites.loading', 'Loading saved matches...')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-border bg-bg">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-text">
          {t('favorites.title', 'Saved Matches')}
        </Text>
        {savedUsers.length > 0 && (
          <Badge variant="primary" size="sm" className="ml-2">
            {savedUsers.length}
          </Badge>
        )}
      </View>

      {/* List */}
      {savedUsers.length > 0 ? (
        <FlatList
          data={savedUsers}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.user.id || index.toString()}
          contentContainerStyle={{ paddingTop: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.brand}
            />
          }
        />
      ) : (
        <EmptyState
          icon={<Heart size={48} color={colors.muted} />}
          title={t('favorites.empty.title', 'No saved matches yet')}
          description={t(
            'favorites.empty.description',
            'Matches you save will appear here'
          )}
          action={{
            label: t('favorites.empty.action', 'Find Flatmates'),
            onPress: () => router.push('/(app)/(matches)'),
          }}
        />
      )}
    </SafeAreaView>
  );
}
