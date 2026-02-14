import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Modal as RNModal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, SlidersHorizontal } from 'lucide-react-native';
import { Button } from '@/components/ui';
import FilterChip from '@/components/ui/FilterChip';
import type { ListingFilters } from '@/types/listing.types';
import { COLORS } from '@/lib/constants';

const ROOM_TYPES = [
  { value: 'Single', label: 'Single', icon: '🛏️' },
  { value: 'Double', label: 'Double', icon: '🛏️🛏️' },
  { value: 'Suite', label: 'Suite', icon: '🏠' },
];

const BUILDING_TYPES = [
  { value: 'Apartment', label: 'Apartment', icon: '🏢' },
  { value: 'Loft', label: 'Loft', icon: '🏗️' },
  { value: 'Block', label: 'Block', icon: '🏘️' },
  { value: 'Detached_House', label: 'House', icon: '🏡' },
];

const RENT_FOR_OPTIONS = [
  { value: 'Open to All', label: 'Anyone', icon: '👥' },
  { value: 'Women', label: 'Women', icon: '👩' },
  { value: 'Man', label: 'Men', icon: '👨' },
  { value: 'Student', label: 'Students', icon: '🎓' },
  { value: 'Family', label: 'Families', icon: '👨‍👩‍👧' },
  { value: 'Couple', label: 'Couples', icon: '💑' },
];

const MAX_TENANTS_OPTIONS = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4+' },
];

interface SearchFiltersModalProps {
  visible: boolean;
  onClose: () => void;
  filters: ListingFilters;
  onApply: (filters: ListingFilters) => void;
  onReset: () => void;
}

export default function SearchFiltersModal({
  visible,
  onClose,
  filters,
  onApply,
  onReset,
}: SearchFiltersModalProps) {
  const { t } = useTranslation('listings');
  const [localFilters, setLocalFilters] = useState<ListingFilters>(filters);

  useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
    }
  }, [visible, filters]);

  const toggleArrayFilter = (key: 'room_types' | 'building_types' | 'rent_for', value: string) => {
    setLocalFilters((prev) => {
      const currentValues = prev[key] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
      return { ...prev, [key]: newValues };
    });
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: ListingFilters = {};
    setLocalFilters(resetFilters);
    onReset();
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.min_price) count++;
    if (localFilters.max_price) count++;
    if (localFilters.min_size) count++;
    if (localFilters.max_size) count++;
    if (localFilters.room_types?.length) count++;
    if (localFilters.building_types?.length) count++;
    if (localFilters.rent_for?.length) count++;
    if (localFilters.max_tenants) count++;
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
              {t('filters.title', 'Filters')}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} className="p-1">
            <X size={24} color={COLORS.gray[500]} />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          {/* Price Range */}
          <View className="mb-6">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              {t('filters.price', 'Price Range')} (PLN/month)
            </Text>
            <View className="flex-row items-center gap-3">
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">Min</Text>
                <TextInput
                  className="border border-gray-200 rounded-lg px-3 py-3 text-center text-base"
                  keyboardType="number-pad"
                  placeholder="0"
                  value={localFilters.min_price?.toString() || ''}
                  onChangeText={(text) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      min_price: text ? parseInt(text) : undefined,
                    }))
                  }
                />
              </View>
              <Text className="text-gray-400 mt-5">—</Text>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">Max</Text>
                <TextInput
                  className="border border-gray-200 rounded-lg px-3 py-3 text-center text-base"
                  keyboardType="number-pad"
                  placeholder="10000"
                  value={localFilters.max_price?.toString() || ''}
                  onChangeText={(text) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      max_price: text ? parseInt(text) : undefined,
                    }))
                  }
                />
              </View>
            </View>
          </View>

          {/* Size Range */}
          <View className="mb-6">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              {t('filters.size', 'Room Size')} (m²)
            </Text>
            <View className="flex-row items-center gap-3">
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">Min</Text>
                <TextInput
                  className="border border-gray-200 rounded-lg px-3 py-3 text-center text-base"
                  keyboardType="number-pad"
                  placeholder="0"
                  value={localFilters.min_size?.toString() || ''}
                  onChangeText={(text) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      min_size: text ? parseInt(text) : undefined,
                    }))
                  }
                />
              </View>
              <Text className="text-gray-400 mt-5">—</Text>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">Max</Text>
                <TextInput
                  className="border border-gray-200 rounded-lg px-3 py-3 text-center text-base"
                  keyboardType="number-pad"
                  placeholder="200"
                  value={localFilters.max_size?.toString() || ''}
                  onChangeText={(text) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      max_size: text ? parseInt(text) : undefined,
                    }))
                  }
                />
              </View>
            </View>
          </View>

          {/* Room Type */}
          <View className="mb-6">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              {t('filters.roomType', 'Room Type')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {ROOM_TYPES.map((type) => (
                <FilterChip
                  key={type.value}
                  label={type.label}
                  icon={type.icon}
                  selected={localFilters.room_types?.includes(type.value) || false}
                  onPress={() => toggleArrayFilter('room_types', type.value)}
                />
              ))}
            </View>
          </View>

          {/* Building Type */}
          <View className="mb-6">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              {t('filters.buildingType', 'Building Type')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {BUILDING_TYPES.map((type) => (
                <FilterChip
                  key={type.value}
                  label={type.label}
                  icon={type.icon}
                  selected={localFilters.building_types?.includes(type.value) || false}
                  onPress={() => toggleArrayFilter('building_types', type.value)}
                />
              ))}
            </View>
          </View>

          {/* Suitable For */}
          <View className="mb-6">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              {t('filters.rentFor', 'Suitable For')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {RENT_FOR_OPTIONS.map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  icon={option.icon}
                  selected={localFilters.rent_for?.includes(option.value) || false}
                  onPress={() => toggleArrayFilter('rent_for', option.value)}
                />
              ))}
            </View>
          </View>

          {/* Max Tenants */}
          <View className="mb-6">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              {t('filters.maxTenants', 'Max Tenants')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {MAX_TENANTS_OPTIONS.map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  selected={localFilters.max_tenants === option.value}
                  onPress={() =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      max_tenants:
                        prev.max_tenants === option.value ? undefined : option.value,
                    }))
                  }
                />
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
