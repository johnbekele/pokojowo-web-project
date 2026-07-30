import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react-native';

import { ListingForm, type ListingFormValues } from '@/components/feature/listings';
import { LoadingSpinner, EmptyState } from '@/components/ui';
import { useListing, useUpdateListing } from '@/hooks/listings/useListings';
import useUIStore from '@/stores/uiStore';
import useTheme from '@/hooks/useTheme';
import type { CreateListingData } from '@/types/listing.types';

export default function EditListingScreen() {
  const { t } = useTranslation('landlord');
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const showToast = useUIStore((s) => s.showToast);

  const { data: listing, isLoading, error } = useListing(id);
  const { mutate: updateListing, isPending } = useUpdateListing(id || '');

  const handleSubmit = (data: CreateListingData) => {
    updateListing(data, {
      onSuccess: () => {
        showToast({ type: 'success', message: t('edit.successMessage', 'Listing updated successfully') });
        router.back();
      },
      onError: () => {
        showToast({ type: 'error', message: t('edit.errorMessage', 'Failed to update listing') });
      },
    });
  };

  const initialValues: Partial<ListingFormValues> | undefined = listing
    ? {
        address: listing.address ?? '',
        price: listing.price != null ? String(listing.price) : '',
        size: listing.size != null ? String(listing.size) : '',
        room_type: listing.room_type ?? '',
        building_type: listing.building_type ?? '',
        max_tenants: listing.max_tenants != null ? String(listing.max_tenants) : '',
        floor: listing.floor != null ? String(listing.floor) : '',
        description_en: listing.description?.en ?? '',
        description_pl: listing.description?.pl ?? '',
      }
    : undefined;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-text">{t('edit.title', 'Edit Listing')}</Text>
      </View>

      {isLoading ? (
        <LoadingSpinner fullScreen text={t('edit.loading', 'Loading listing...')} />
      ) : error || !listing ? (
        <EmptyState
          title={t('edit.notFound', 'Listing not found')}
          description={t('edit.notFoundDescription', 'This listing may no longer be available')}
          action={{ label: t('edit.goBack', 'Go Back'), onPress: () => router.back() }}
        />
      ) : (
        // ListingForm brings its own keyboard-aware scroll container.
        <ListingForm
          initialValues={initialValues}
          initialImages={listing.images || []}
          submitLabel={t('edit.submit', 'Save Changes')}
          submitting={isPending}
          onSubmit={handleSubmit}
        />
      )}
    </SafeAreaView>
  );
}
