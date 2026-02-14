import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Modal as RNModal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, SlidersHorizontal } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { Button } from '@/components/ui';
import type { MatchingFilters } from '@/types/matching.types';
import { COLORS } from '@/lib/constants';

interface MatchFiltersModalProps {
  visible: boolean;
  onClose: () => void;
  filters: MatchingFilters;
  onApply: (filters: MatchingFilters) => void;
  onReset: () => void;
}

export default function MatchFiltersModal({
  visible,
  onClose,
  filters,
  onApply,
  onReset,
}: MatchFiltersModalProps) {
  const { t } = useTranslation('matching');
  const [localFilters, setLocalFilters] = useState<MatchingFilters>(filters);

  useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
    }
  }, [visible, filters]);

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: MatchingFilters = { limit: 50 };
    setLocalFilters(resetFilters);
    onReset();
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.location) count++;
    if (localFilters.minScore && localFilters.minScore > 0) count++;
    return count;
  };

  const activeCount = getActiveFilterCount();

  return (
    <RNModal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <View className="flex-row items-center gap-2">
            <SlidersHorizontal size={20} color={COLORS.primary[600]} />
            <Text className="text-xl font-bold text-gray-900">
              {t('filters.title', 'Match Filters')}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} className="p-1">
            <X size={24} color={COLORS.gray[500]} />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          {/* Minimum Compatibility Score */}
          <View className="mb-8">
            <Text className="text-base font-semibold text-gray-900 mb-2">
              {t('filters.minScore', 'Minimum Compatibility Score')}
            </Text>
            <Text className="text-sm text-gray-500 mb-4">
              {t('filters.minScoreDescription', 'Only show matches with at least this compatibility score')}
            </Text>

            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-gray-600">0%</Text>
              <View className="bg-primary-100 px-4 py-2 rounded-full">
                <Text className="text-primary-700 font-bold text-lg">
                  {localFilters.minScore || 0}%
                </Text>
              </View>
              <Text className="text-gray-600">100%</Text>
            </View>

            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={0}
              maximumValue={100}
              step={5}
              value={localFilters.minScore || 0}
              onValueChange={(value) =>
                setLocalFilters((prev) => ({ ...prev, minScore: value }))
              }
              minimumTrackTintColor={COLORS.primary[600]}
              maximumTrackTintColor={COLORS.gray[200]}
              thumbTintColor={COLORS.primary[600]}
            />

            {/* Quick score buttons */}
            <View className="flex-row flex-wrap gap-2 mt-4">
              {[0, 50, 60, 70, 80].map((score) => (
                <TouchableOpacity
                  key={score}
                  onPress={() => setLocalFilters((prev) => ({ ...prev, minScore: score }))}
                  className={`px-4 py-2 rounded-lg ${
                    localFilters.minScore === score
                      ? 'bg-primary-600'
                      : 'bg-gray-100'
                  }`}
                >
                  <Text
                    className={`font-medium ${
                      localFilters.minScore === score ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {score === 0 ? t('filters.anyScore', 'Any') : `${score}%+`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location */}
          <View className="mb-8">
            <Text className="text-base font-semibold text-gray-900 mb-2">
              {t('filters.location', 'Location')}
            </Text>
            <Text className="text-sm text-gray-500 mb-4">
              {t('filters.locationDescription', 'Filter matches by preferred location')}
            </Text>

            <TextInput
              className="border border-gray-200 rounded-lg px-4 py-3 text-base"
              placeholder={t('filters.locationPlaceholder', 'e.g., Warsaw, Krakow...')}
              value={localFilters.location || ''}
              onChangeText={(text) =>
                setLocalFilters((prev) => ({
                  ...prev,
                  location: text || undefined,
                }))
              }
            />
          </View>

          {/* Results limit */}
          <View className="mb-8">
            <Text className="text-base font-semibold text-gray-900 mb-2">
              {t('filters.resultsLimit', 'Results per page')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {[20, 30, 50, 100].map((limit) => (
                <TouchableOpacity
                  key={limit}
                  onPress={() => setLocalFilters((prev) => ({ ...prev, limit }))}
                  className={`px-4 py-2 rounded-lg ${
                    localFilters.limit === limit
                      ? 'bg-primary-600'
                      : 'bg-gray-100'
                  }`}
                >
                  <Text
                    className={`font-medium ${
                      localFilters.limit === limit ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {limit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View className="flex-row gap-3 p-4 border-t border-gray-100">
          <Button
            variant="outline"
            className="flex-1"
            onPress={handleReset}
            disabled={activeCount === 0}
          >
            {t('filters.reset', 'Reset')}
          </Button>
          <Button variant="primary" className="flex-1" onPress={handleApply}>
            {t('filters.apply', 'Apply')}
            {activeCount > 0 && ` (${activeCount})`}
          </Button>
        </View>
      </SafeAreaView>
    </RNModal>
  );
}
