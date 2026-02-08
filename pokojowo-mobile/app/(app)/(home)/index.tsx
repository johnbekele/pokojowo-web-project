import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Search, SlidersHorizontal } from 'lucide-react-native';

import { useListings } from '@/hooks/listings/useListings';
import ListingCard from '@/components/feature/listings/ListingCard';
import { COLORS } from '@/lib/constants';

export default function HomeScreen() {
  const { t } = useTranslation('listings');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: listings, isLoading, isRefetching, refetch } = useListings({
    search: searchQuery,
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const hasListings = listings && listings.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">
          {t('title', 'Discover')}
        </Text>
        <Text className="text-gray-500">
          {t('subtitle', 'Find your perfect room')}
        </Text>
      </View>

      {/* Search bar */}
      <View className="px-4 pt-4 pb-2">
        <View className="flex-row items-center gap-3 mb-4">
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-lg px-4 py-3">
            <Search size={20} color={COLORS.gray[400]} />
            <TextInput
              className="flex-1 ml-3 text-base"
              placeholder={t('search.placeholder', 'Search locations...')}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            className="bg-gray-100 p-3 rounded-lg"
            onPress={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal size={20} color={COLORS.gray[600]} />
          </TouchableOpacity>
        </View>

        {/* Results count */}
        <Text className="text-gray-500 mb-2">
          {t('results.count', '{{count}} listings found', {
            count: listings?.length || 0,
          })}
        </Text>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={COLORS.primary[600]}
          />
        }
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={COLORS.primary[600]} />
          </View>
        ) : hasListings ? (
          listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))
        ) : (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-gray-400 text-lg mb-2">
              {t('empty.title', 'No listings found')}
            </Text>
            <Text className="text-gray-400">
              {t('empty.subtitle', 'Try adjusting your search or filters')}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
