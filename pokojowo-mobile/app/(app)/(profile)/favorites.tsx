import { View, Text, RefreshControl, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Heart } from 'lucide-react-native';

import { Avatar, LoadingSpinner, EmptyState, Card, Badge } from '@/components/ui';
import { useSavedUsers } from '@/hooks/favorites/useFavorites';
import type { FavoriteUser } from '@/services/favorites.service';
import { COLORS } from '@/lib/constants';
import { formatRelativeTime } from '@/lib/utils';

export default function FavoritesScreen() {
  const { t } = useTranslation('profile');
  const router = useRouter();

  const { data, isLoading, isRefetching, refetch } = useSavedUsers();

  const savedUsers = data?.saved_users || [];

  const renderItem = ({ item }: { item: FavoriteUser }) => {
    const photoUrl = typeof item.user.photo === 'string'
      ? item.user.photo
      : (item.user.photo as { url?: string } | undefined)?.url;

    const displayName = item.user.firstname
      ? `${item.user.firstname} ${item.user.lastname || ''}`.trim()
      : item.user.username || 'Unknown';

    return (
      <Card
        variant="elevated"
        padding="md"
        className="mx-4 mb-3"
        onPress={() => {
          // Navigate to user profile or chat
        }}
      >
        <View className="flex-row items-center">
          <Avatar
            source={photoUrl}
            name={displayName}
            size="lg"
          />
          <View className="flex-1 ml-3">
            <Text className="text-base font-semibold text-gray-900">
              {displayName}
            </Text>
            {item.user.location && (
              <Text className="text-sm text-gray-500">{item.user.location}</Text>
            )}
            <Text className="text-xs text-gray-400 mt-1">
              Saved {formatRelativeTime(item.saved_at)}
            </Text>
          </View>
          <Heart size={20} color={COLORS.primary[600]} fill={COLORS.primary[600]} />
        </View>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <LoadingSpinner fullScreen text={t('favorites.loading', 'Loading saved matches...')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ArrowLeft size={24} color={COLORS.gray[700]} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">
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
              tintColor={COLORS.primary[600]}
            />
          }
        />
      ) : (
        <EmptyState
          icon={<Heart size={48} color={COLORS.gray[400]} />}
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
