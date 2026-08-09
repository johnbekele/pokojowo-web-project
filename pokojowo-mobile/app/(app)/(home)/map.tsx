import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Crosshair,
  List,
  SlidersHorizontal,
} from 'lucide-react-native';

import ListingMapView from '@/components/feature/listings/ListingMapView';
import MapPinCard from '@/components/feature/listings/MapPinCard';
import SearchFiltersModal from '@/components/feature/listings/SearchFiltersModal';
import FlatmatePinCard from '@/components/feature/matching/FlatmatePinCard';
import MapLayerToggle, {
  type MapLayer,
} from '@/components/feature/listings/MapLayerToggle';
import { useListingMapPins } from '@/hooks/listings/useListingMapPins';
import { useFlatmateMapPins } from '@/hooks/matching/useFlatmateMapPins';
import useAuthStore from '@/stores/authStore';
import useUIStore from '@/stores/uiStore';
import useTheme from '@/hooks/useTheme';
import { regionAround } from '@/lib/mapRegion';
import type { ListingFilters } from '@/types/listing.types';
import type { FlatmateMapPin, ListingMapPin } from '@/types/map.types';

/**
 * Map mode for Discover: pan to an area (your office, a campus) to see what's
 * available there, and optionally who else is looking to live there.
 *
 * Filters arrive as a JSON param so the map and list views share them.
 */
export default function ListingsMapScreen() {
  const { t } = useTranslation('listings');
  const router = useRouter();
  const { colors } = useTheme();
  const showToast = useUIStore((s) => s.showToast);
  const { user } = useAuthStore();
  const params = useLocalSearchParams<{ filters?: string }>();

  const [filters, setFilters] = useState<ListingFilters>(() => {
    try {
      return params.filters
        ? (JSON.parse(params.filters) as ListingFilters)
        : {};
    } catch {
      return {};
    }
  });

  const [showFilters, setShowFilters] = useState(false);
  const [layer, setLayer] = useState<MapLayer>('flats');
  const [viewport, setViewport] = useState<{
    bbox: string | null;
    zoom: number | null;
  }>({
    bbox: null,
    zoom: null,
  });
  const [selectedPin, setSelectedPin] = useState<ListingMapPin | null>(null);
  const [selectedFlatmate, setSelectedFlatmate] =
    useState<FlatmateMapPin | null>(null);
  const [focusRegion, setFocusRegion] = useState<ReturnType<
    typeof regionAround
  > | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const showListings = layer !== 'flatmates';
  const showFlatmates = layer !== 'flats';
  // The endpoint rejects incomplete profiles, so don't ask on their behalf.
  const canSeeFlatmates = !!user?.isProfileComplete;

  const { data: listingData, isFetching } = useListingMapPins({
    bbox: viewport.bbox,
    zoom: viewport.zoom,
    filters,
    enabled: showListings,
  });

  const { data: flatmateData } = useFlatmateMapPins({
    bbox: viewport.bbox,
    enabled: showFlatmates && canSeeFlatmates,
  });

  const handleRegionChange = useCallback(
    (value: { bbox: string; zoom: number }) => setViewport(value),
    [],
  );

  const handleNearMe = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast({
          type: 'warning',
          message: t('map.locationDenied', 'Location permission denied'),
        });
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setFocusRegion(
        regionAround(position.coords.latitude, position.coords.longitude),
      );
    } catch {
      showToast({
        type: 'error',
        message: t('map.locationFailed', 'Could not get your location'),
      });
    } finally {
      setIsLocating(false);
    }
  };

  const summary = showListings
    ? listingData.mode === 'clusters'
      ? t('map.zoomForPins', 'Zoom in to see individual rooms')
      : t('map.listingCount', '{{count}} rooms in view', {
          count: listingData.total,
        })
    : t('map.flatmateCount', '{{count}} flatmates looking here', {
        count: flatmateData.pins.length,
      });
  const hasTruncatedResults =
    (showListings && listingData.truncated) ||
    (showFlatmates && flatmateData.truncated);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="px-4 py-3 flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-bold text-text">
            {t('map.title', 'Map search')}
          </Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-muted text-xs">{summary}</Text>
            {isFetching && (
              <ActivityIndicator size="small" color={colors.muted} />
            )}
          </View>
        </View>
        <TouchableOpacity
          className="bg-surface p-2.5 rounded-xl"
          onPress={() => setShowFilters(true)}
        >
          <SlidersHorizontal size={18} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-surface p-2.5 rounded-xl"
          onPress={() => router.back()}
          accessibilityLabel={t('map.showList', 'Show list')}
        >
          <List size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View className="px-4 pb-2">
        <MapLayerToggle value={layer} onChange={setLayer} />
      </View>

      <View className="flex-1">
        <ListingMapView
          data={listingData}
          flatmatePins={
            showFlatmates && canSeeFlatmates ? flatmateData.pins : []
          }
          showListings={showListings}
          selectedPinId={selectedPin?.id ?? null}
          onRegionChange={handleRegionChange}
          onSelectPin={(pin) => {
            setSelectedFlatmate(null);
            setSelectedPin(pin);
          }}
          onSelectFlatmate={(pin) => {
            setSelectedPin(null);
            setSelectedFlatmate(pin);
          }}
          focusRegion={focusRegion}
        />

        <TouchableOpacity
          onPress={handleNearMe}
          disabled={isLocating}
          className="absolute right-4 top-4 h-11 w-11 rounded-full bg-card border border-border items-center justify-center"
          accessibilityLabel={t('map.useMyLocation', 'Use my location')}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Crosshair size={20} color={colors.text} />
          )}
        </TouchableOpacity>

        {showFlatmates && !canSeeFlatmates && (
          <View className="absolute left-4 right-4 top-4 rounded-xl bg-card/95 border border-border px-3 py-2">
            <Text className="text-muted text-xs">
              {t(
                'map.flatmatesNeedProfile',
                'Complete your tenant profile to see who else is looking here.',
              )}
            </Text>
          </View>
        )}

        {hasTruncatedResults && (
          <View className="absolute left-4 right-16 top-16 rounded-xl bg-card/95 border border-border px-3 py-2">
            <Text className="text-muted text-xs">
              {t(
                'map.truncated',
                'Some results are hidden at this zoom. Zoom in to see more.',
              )}
            </Text>
          </View>
        )}

        {selectedPin && (
          <MapPinCard
            pin={selectedPin}
            onDismiss={() => setSelectedPin(null)}
            onPress={() =>
              router.push(`/(app)/(home)/listing/${selectedPin.id}`)
            }
          />
        )}

        {selectedFlatmate && (
          <FlatmatePinCard
            pin={selectedFlatmate}
            onDismiss={() => setSelectedFlatmate(null)}
            onPress={() =>
              router.push(`/(app)/(matches)/profile/${selectedFlatmate.userId}`)
            }
          />
        )}
      </View>

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
