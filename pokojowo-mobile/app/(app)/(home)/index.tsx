import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Search, SlidersHorizontal, Home as HomeIcon, Map as MapIcon, Bookmark } from 'lucide-react-native';

import { useListings } from '@/hooks/listings/useListings';
import ListingCard from '@/components/feature/listings/ListingCard';
import ListingCardSkeleton from '@/components/feature/listings/ListingCardSkeleton';
import SearchFiltersModal from '@/components/feature/listings/SearchFiltersModal';
import NotificationBell from '@/components/shared/NotificationBell';
import { Button, EmptyState, Input, Modal } from '@/components/ui';
import type { ListingFilters } from '@/types/listing.types';
import useTheme from '@/hooks/useTheme';
import { savedSearchService } from '@/services';
import { savedSearchFilters, savedSearchPayload } from '@/types/saved-search.types';
import { useCreateSavedSearch } from '@/hooks/saved-searches/useSavedSearches';
import useUIStore from '@/stores/uiStore';

export default function HomeScreen() {
  const { t } = useTranslation('listings');
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ savedSearch?: string | string[] }>();
  const savedSearchParam = Array.isArray(params.savedSearch) ? params.savedSearch[0] : params.savedSearch;
  const showToast = useUIStore((state) => state.showToast);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSaveSearch, setShowSaveSearch] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveError, setSaveError] = useState('');
  const [filters, setFilters] = useState<ListingFilters>({});
  const appliedSavedSearch = useRef<string | null>(null);
  const createSavedSearch = useCreateSavedSearch();

  useEffect(() => {
    if (!savedSearchParam || appliedSavedSearch.current === savedSearchParam) return;
    appliedSavedSearch.current = savedSearchParam;
    savedSearchService
      .get(savedSearchParam)
      .then(({ data }) => {
        const nextFilters = savedSearchFilters(data);
        setFilters(nextFilters);
        setSearchQuery(data.search || '');
      })
      .catch(() => {
        showToast({ type: 'error', message: t('savedSearches.applyFailed', 'Could not load that saved search') });
      });
  }, [savedSearchParam, showToast, t]);

  const { data: listings, isLoading, isRefetching, refetch } = useListings({
    ...filters,
    search: searchQuery,
  });

  const activeFilterCount = Object.keys(filters).filter((key) => {
    const value = filters[key as keyof ListingFilters];
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null;
  }).length;
  const canSaveSearch = activeFilterCount > 0 || Boolean(searchQuery.trim());

  const openSaveSearch = (nextFilters = filters) => {
    setShowFilters(false);
    setFilters(nextFilters);
    setSaveError('');
    setSaveName(nextFilters.city || searchQuery.trim() || t('savedSearches.defaultName', 'My search'));
    setShowSaveSearch(true);
  };

  const handleSaveSearch = async () => {
    const name = saveName.trim();
    if (!name) {
      setSaveError(t('savedSearches.nameRequired', 'Enter a name for this search'));
      return;
    }

    try {
      await createSavedSearch.mutateAsync(savedSearchPayload(name, { ...filters, search: searchQuery }));
      setShowSaveSearch(false);
      showToast({ type: 'success', message: t('savedSearches.saved', 'Search saved') });
    } catch {
      setSaveError(t('savedSearches.saveFailed', 'Could not save search'));
    }
  };

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
        canSaveSearch={canSaveSearch}
        onSaveSearch={openSaveSearch}
      />

      <Modal
        visible={showSaveSearch}
        onClose={() => setShowSaveSearch(false)}
        title={t('savedSearches.dialogTitle', 'Save this search')}
        size="sm"
      >
        <Text className="text-muted mb-4">
          {t('savedSearches.dialogDescription', 'Name your current filters so you can run them again later.')}
        </Text>
        <Input
          label={t('savedSearches.nameLabel', 'Search name')}
          value={saveName}
          maxLength={60}
          onChangeText={(value) => {
            setSaveName(value);
            setSaveError('');
          }}
          placeholder={t('savedSearches.namePlaceholder', 'e.g. Warsaw under 2500')}
          error={saveError}
          autoFocus
        />
        <View className="flex-row gap-3 mt-2">
          <Button variant="outline" className="flex-1" onPress={() => setShowSaveSearch(false)}>
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onPress={handleSaveSearch}
            loading={createSavedSearch.isPending}
            leftIcon={<Bookmark size={17} color={colors.brandFg} />}
          >
            {t('savedSearches.save', 'Save search')}
          </Button>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
