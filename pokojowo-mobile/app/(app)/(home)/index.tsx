import { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Search, SlidersHorizontal, Home as HomeIcon, Map as MapIcon } from 'lucide-react-native';

import { useListings } from '@/hooks/listings/useListings';
import ListingCard from '@/components/feature/listings/ListingCard';
import ListingCardSkeleton from '@/components/feature/listings/ListingCardSkeleton';
import SearchFiltersModal from '@/components/feature/listings/SearchFiltersModal';
import NotificationBell from '@/components/shared/NotificationBell';
import { EmptyState } from '@/components/ui';
import type { ListingFilters } from '@/types/listing.types';
import useTheme from '@/hooks/useTheme';

export default function HomeScreen() {
  const { t } = useTranslation('listings');
  const { colors } = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ListingFilters>({});

  const { data: listings, isLoading, isRefetching, refetch } = useListings({
    ...filters,
    search: searchQuery,
  });

  const activeFilterCount = Object.keys(filters).filter((key) => {
    const value = filters[key as keyof ListingFilters];
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null;
  }).length;

  const onRefresh = useCallback(() => refetch(), [refetch]);
  const hasListings = !!listings && listings.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-text">{t('title', 'Discover')}</Text>
          <Text className="text-muted">{t('subtitle', 'Find your perfect room')}</Text>
        </View>
        <NotificationBell />
      </View>

      {/* Search + filter */}
      <View className="px-4 pt-1 pb-2">
        <View className="flex-row items-center gap-3 mb-3">
          <View className="flex-1 flex-row items-center bg-surface rounded-xl px-4 py-3">
            <Search size={20} color={colors.muted} />
            <TextInput
              className="flex-1 ml-3 text-base text-text"
              placeholder={t('search.placeholder', 'Search locations...')}
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity
            className="bg-surface p-3 rounded-xl relative"
            onPress={() => setShowFilters(true)}
            accessibilityRole="button"
            accessibilityLabel={t('filters.title', 'Filters')}
          >
            <SlidersHorizontal size={20} color={colors.text} />
            {activeFilterCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-brand rounded-full w-5 h-5 items-center justify-center">
                <Text className="text-brand-fg text-xs font-bold">{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-surface p-3 rounded-xl"
            // Filters travel as a param so the map opens on the same search.
            onPress={() => {
              const query = encodeURIComponent(
                JSON.stringify({ ...filters, search: searchQuery || undefined }),
              );
              router.push(`/(app)/(home)/map?filters=${query}`);
            }}
            accessibilityLabel={t('map.showMap', 'Show map')}
          >
            <MapIcon size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        {!isLoading && (
          <Text className="text-muted mb-1">
            {t('results.count', '{{count}} listings found', { count: listings?.length || 0 })}
          </Text>
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="pt-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </View>
      ) : hasListings ? (
        <FlashList
          data={listings}
          keyExtractor={(item, index) => item.id || item._id || `listing-${index}`}
          renderItem={({ item }) => <ListingCard listing={item} />}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.brand} />
          }
        />
      ) : (
        <EmptyState
          icon={<HomeIcon size={48} color={colors.muted} />}
          title={t('empty.title', 'No listings found')}
          description={t('empty.subtitle', 'Try adjusting your search or filters')}
        />
      )}

      <SearchFiltersModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onApply={setFilters}
        onReset={() => setFilters({})}
      />
    </SafeAreaView>
  );
}
