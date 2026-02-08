import { View, Text, RefreshControl, Alert, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Plus, Home, ArrowLeft, Edit, Trash2 } from 'lucide-react-native';

import { Button, Card, Badge, LoadingSpinner, EmptyState } from '@/components/ui';
import { useMyListings, useDeleteListing } from '@/hooks/listings/useListings';
import type { Listing } from '@/types/listing.types';
import { formatCurrency } from '@/lib/utils';
import { COLORS } from '@/lib/constants';

export default function MyListingsScreen() {
  const { t } = useTranslation('landlord');
  const router = useRouter();

  const { data: listings, isLoading, isRefetching, refetch } = useMyListings();
  const { mutate: deleteListing, isPending: isDeleting } = useDeleteListing();

  const handleDeleteListing = (listingId: string, address: string) => {
    Alert.alert(
      t('delete.title', 'Delete Listing'),
      t('delete.message', `Are you sure you want to delete "${address}"?`),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: () => {
            deleteListing(listingId, {
              onSuccess: () => {
                Alert.alert(
                  t('delete.successTitle', 'Deleted'),
                  t('delete.successMessage', 'Listing deleted successfully')
                );
              },
              onError: () => {
                Alert.alert(
                  t('delete.errorTitle', 'Error'),
                  t('delete.errorMessage', 'Failed to delete listing')
                );
              },
            });
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Listing }) => (
    <Card
      variant="elevated"
      padding="md"
      className="mx-4 mb-3"
      onPress={() => router.push(`/(app)/(home)/listing/${item.id}`)}
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
          <Text className="text-base font-semibold text-gray-900" numberOfLines={2}>
            {item.address}
          </Text>
          <Text className="text-primary-600 font-bold text-lg mt-1">
            {formatCurrency(item.price)}
            <Text className="text-sm font-normal text-gray-500">/mo</Text>
          </Text>
          <View className="flex-row items-center gap-4 mt-2">
            {item.size && (
              <Text className="text-sm text-gray-500">{item.size} m²</Text>
            )}
            {item.max_tenants && (
              <Text className="text-sm text-gray-500">
                Max {item.max_tenants} tenants
              </Text>
            )}
          </View>
        </View>

        {/* Actions */}
        <View className="flex-col gap-2">
          <TouchableOpacity
            onPress={() => router.push(`/(app)/(landlord)/edit-listing/${item.id}`)}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
          >
            <Edit size={18} color={COLORS.gray[600]} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteListing(item.id, item.address)}
            className="w-10 h-10 rounded-full bg-red-50 items-center justify-center"
          >
            <Trash2 size={18} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <LoadingSpinner fullScreen text={t('loading', 'Loading listings...')} />
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
        <Text className="text-xl font-bold text-gray-900 flex-1">
          {t('myListings.title', 'My Listings')}
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(app)/(landlord)/create-listing')}
          className="bg-primary-600 rounded-full p-2"
        >
          <Plus size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Listings */}
      {listings && listings.length > 0 ? (
        <FlatList
          data={listings}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
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
          icon={<Home size={48} color={COLORS.gray[400]} />}
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
