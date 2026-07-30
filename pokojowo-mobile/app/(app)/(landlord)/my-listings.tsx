import { View, Text, RefreshControl, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Plus, Home, ArrowLeft, Edit, Trash2 } from 'lucide-react-native';

import { Card, Badge, LoadingSpinner, EmptyState } from '@/components/ui';
import { useMyListings, useDeleteListing } from '@/hooks/listings/useListings';
import type { Listing } from '@/types/listing.types';
import { formatCurrency } from '@/lib/utils';
import useUIStore from '@/stores/uiStore';
import useTheme from '@/hooks/useTheme';

export default function MyListingsScreen() {
  const { t } = useTranslation('landlord');
  const router = useRouter();
  const { colors } = useTheme();
  const confirm = useUIStore((s) => s.confirm);
  const showToast = useUIStore((s) => s.showToast);

  const { data: listings, isLoading, isRefetching, refetch } = useMyListings();
  const { mutate: deleteListing } = useDeleteListing();

  const handleDeleteListing = async (listingId: string, address: string) => {
    const ok = await confirm({
      title: t('delete.title', 'Delete Listing'),
      message: t('delete.message', 'Are you sure you want to delete "{{address}}"?', { address }),
      confirmLabel: t('delete.confirm', 'Delete'),
      destructive: true,
    });
    if (!ok) return;
    deleteListing(listingId, {
      onSuccess: () =>
        showToast({ type: 'success', message: t('delete.successMessage', 'Listing deleted successfully') }),
      onError: () =>
        showToast({ type: 'error', message: t('delete.errorMessage', 'Failed to delete listing') }),
    });
  };

  const renderItem = ({ item }: { item: Listing }) => {
    const itemId = item.id || item._id;
    return (
    <Card
      variant="elevated"
      padding="md"
      className="mx-4 mb-3"
      onPress={() => router.push(`/(app)/(home)/listing/${itemId}`)}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center gap-2 mb-1">
            <Badge variant={item.is_active ? 'success' : 'default'} size="sm">
              {item.is_active ? 'Active' : 'Inactive'}
            </Badge>
            {item.room_type && (
              <Badge variant="primary" size="sm">
                {item.room_type}
              </Badge>
            )}
          </View>
          <Text className="text-base font-semibold text-text" numberOfLines={2}>
            {item.address}
          </Text>
          <Text className="text-brand font-bold text-lg mt-1">
            {formatCurrency(item.price)}
            <Text className="text-sm font-normal text-muted">/mo</Text>
          </Text>
          <View className="flex-row items-center gap-4 mt-2">
            {item.size && (
              <Text className="text-sm text-muted">{item.size} m²</Text>
            )}
            {item.max_tenants && (
              <Text className="text-sm text-muted">
                Max {item.max_tenants} tenants
              </Text>
            )}
          </View>
        </View>

        {/* Actions */}
        <View className="flex-col gap-2">
          <TouchableOpacity
            onPress={() => router.push(`/(app)/(landlord)/edit-listing/${itemId}`)}
            className="w-10 h-10 rounded-full bg-surface items-center justify-center"
          >
            <Edit size={18} color={colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteListing(itemId!, item.address)}
            className="w-10 h-10 rounded-full bg-danger/10 items-center justify-center"
          >
            <Trash2 size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );};

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface">
        <LoadingSpinner fullScreen text={t('loading', 'Loading listings...')} />
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
        <Text className="text-xl font-bold text-text flex-1">
          {t('myListings.title', 'My Listings')}
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(app)/(landlord)/create-listing')}
          className="bg-brand rounded-full p-2"
        >
          <Plus size={20} color={colors.brandFg} />
        </TouchableOpacity>
      </View>

      {/* Listings */}
      {listings && listings.length > 0 ? (
        <FlatList
          data={listings}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.id || item._id || `listing-${index}`}
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
          icon={<Home size={48} color={colors.muted} />}
          title={t('myListings.empty.title', 'No listings yet')}
          description={t(
            'myListings.empty.description',
            'Create your first listing to start finding tenants'
          )}
          action={{
            label: t('myListings.empty.action', 'Create Listing'),
            onPress: () => router.push('/(app)/(landlord)/create-listing'),
          }}
        />
      )}
    </SafeAreaView>
  );
}
