import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Home,
  Plus,
  Eye,
  MessageSquare,
  TrendingUp,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react-native';

import { Card, Badge, LoadingSpinner } from '@/components/ui';
import { useMyListings } from '@/hooks/listings/useListings';
import { formatCurrency } from '@/lib/utils';
import { COLORS } from '@/lib/constants';

export default function LandlordDashboard() {
  const { t } = useTranslation('landlord');
  const router = useRouter();

  const { data: listings, isLoading, isRefetching, refetch } = useMyListings();

  const totalListings = listings?.length || 0;
  const activeListings = listings?.filter((l) => l.is_active)?.length || 0;

  const stats = [
    {
      icon: <Home size={24} color={COLORS.primary[600]} />,
      label: t('stats.total', 'Total Listings'),
      value: totalListings,
      color: 'bg-primary-50',
    },
    {
      icon: <Eye size={24} color={COLORS.info} />,
      label: t('stats.active', 'Active'),
      value: activeListings,
      color: 'bg-blue-50',
    },
    {
      icon: <MessageSquare size={24} color={COLORS.success} />,
      label: t('stats.inquiries', 'Inquiries'),
      value: 0, // TODO: Fetch from API
      color: 'bg-green-50',
    },
    {
      icon: <TrendingUp size={24} color={COLORS.warning} />,
      label: t('stats.views', 'Views'),
      value: 0, // TODO: Fetch from API
      color: 'bg-yellow-50',
    },
  ];

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <LoadingSpinner fullScreen text={t('loading', 'Loading dashboard...')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={COLORS.primary[600]}
          />
        }
      >
        {/* Header */}
        <View className="px-4 py-4 bg-white border-b border-gray-100">
          <View className="flex-row items-center mb-2">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <ArrowLeft size={24} color={COLORS.gray[700]} />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-gray-900 flex-1">
              {t('title', 'Dashboard')}
            </Text>
          </View>
          <Text className="text-gray-500 ml-9">
            {t('subtitle', 'Manage your properties')}
          </Text>
        </View>

        {/* Stats Grid */}
        <View className="p-4">
          <View className="flex-row flex-wrap gap-3">
            {stats.map((stat, index) => (
              <Card
                key={index}
                variant="elevated"
                padding="md"
                className="flex-1 min-w-[45%]"
              >
                <View className={`w-12 h-12 rounded-xl ${stat.color} items-center justify-center mb-3`}>
                  {stat.icon}
                </View>
                <Text className="text-2xl font-bold text-gray-900">{stat.value}</Text>
                <Text className="text-sm text-gray-500">{stat.label}</Text>
              </Card>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            {t('quickActions', 'Quick Actions')}
          </Text>
          <Card variant="elevated" padding="none">
            <TouchableOpacity
              onPress={() => router.push('/(app)/(landlord)/create-listing')}
              className="flex-row items-center p-4 border-b border-gray-100"
            >
              <View className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center">
                <Plus size={20} color={COLORS.primary[600]} />
              </View>
              <Text className="flex-1 ml-3 text-base text-gray-900">
                {t('actions.createListing', 'Create New Listing')}
              </Text>
              <ChevronRight size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(app)/(landlord)/my-listings')}
              className="flex-row items-center p-4"
            >
              <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center">
                <Home size={20} color={COLORS.info} />
              </View>
              <Text className="flex-1 ml-3 text-base text-gray-900">
                {t('actions.viewListings', 'View My Listings')}
              </Text>
              <ChevronRight size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Recent Listings */}
        {listings && listings.length > 0 && (
          <View className="px-4 mb-8">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-semibold text-gray-900">
                {t('recentListings', 'Recent Listings')}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(app)/(landlord)/my-listings')}>
                <Text className="text-primary-600 font-medium">
                  {t('viewAll', 'View All')}
                </Text>
              </TouchableOpacity>
            </View>
            {listings.slice(0, 3).map((listing) => (
              <Card
                key={listing.id}
                variant="elevated"
                padding="md"
                className="mb-3"
                onPress={() => router.push(`/(app)/(home)/listing/${listing.id}`)}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
                      {listing.address}
                    </Text>
                    <Text className="text-primary-600 font-bold mt-1">
                      {formatCurrency(listing.price)}/mo
                    </Text>
                  </View>
                  <Badge variant={listing.is_active ? 'success' : 'default'}>
                    {listing.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
