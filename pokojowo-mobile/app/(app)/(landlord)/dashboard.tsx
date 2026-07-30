import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Home,
  Plus,
  Eye,
  Heart,
  MessageSquare,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react-native';

import { Card, Badge, LoadingSpinner } from '@/components/ui';
import { useMyListings, useLandlordStats } from '@/hooks/listings/useListings';
import { formatCurrency } from '@/lib/utils';
import useTheme from '@/hooks/useTheme';

export default function LandlordDashboard() {
  const { t } = useTranslation('landlord');
  const router = useRouter();
  const { colors } = useTheme();

  const { data: listings, isLoading, isRefetching, refetch } = useMyListings();

  const listingIds = (listings || [])
    .map((l) => l.id || l._id)
    .filter((v): v is string => !!v);
  const { totals } = useLandlordStats(listingIds);

  const totalListings = listings?.length || 0;
  const activeListings = listings?.filter((l) => l.is_active)?.length || 0;

  const stats = [
    { icon: <Home size={24} color={colors.brand} />, label: t('stats.total', 'Total Listings'), value: totalListings },
    { icon: <Eye size={24} color={colors.info} />, label: t('stats.views', 'Views'), value: totals.views },
    { icon: <Heart size={24} color={colors.danger} />, label: t('stats.likes', 'Likes'), value: totals.likes },
    { icon: <MessageSquare size={24} color={colors.success} />, label: t('stats.inquiries', 'Inquiries'), value: totals.inquiries },
  ];

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface">
        <LoadingSpinner fullScreen text={t('loading', 'Loading dashboard...')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />
        }
      >
        {/* Header */}
        <View className="px-4 py-4 bg-bg border-b border-border">
          <View className="flex-row items-center mb-2">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-text flex-1">{t('title', 'Dashboard')}</Text>
          </View>
          <Text className="text-muted ml-9">{t('subtitle', 'Manage your properties')}</Text>
        </View>

        {/* Stats Grid */}
        <View className="p-4">
          <View className="flex-row flex-wrap gap-3">
            {stats.map((stat, index) => (
              <Card key={index} variant="elevated" padding="md" className="flex-1 min-w-[45%]">
                <View className="w-12 h-12 rounded-xl bg-surface items-center justify-center mb-3">
                  {stat.icon}
                </View>
                <Text className="text-2xl font-bold text-text">{stat.value}</Text>
                <Text className="text-sm text-muted">{stat.label}</Text>
              </Card>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-4 mb-4">
          <Text className="text-lg font-semibold text-text mb-3">{t('quickActions', 'Quick Actions')}</Text>
          <Card variant="elevated" padding="none">
            <TouchableOpacity
              onPress={() => router.push('/(app)/(landlord)/create-listing')}
              className="flex-row items-center p-4 border-b border-border"
            >
              <View className="w-10 h-10 rounded-full bg-brand/10 items-center justify-center">
                <Plus size={20} color={colors.brand} />
              </View>
              <Text className="flex-1 ml-3 text-base text-text">
                {t('actions.createListing', 'Create New Listing')}
              </Text>
              <ChevronRight size={20} color={colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(app)/(landlord)/my-listings')}
              className="flex-row items-center p-4"
            >
              <View className="w-10 h-10 rounded-full bg-info/10 items-center justify-center">
                <Home size={20} color={colors.info} />
              </View>
              <Text className="flex-1 ml-3 text-base text-text">
                {t('actions.viewListings', 'View My Listings')}
              </Text>
              <ChevronRight size={20} color={colors.muted} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Recent Listings */}
        {listings && listings.length > 0 && (
          <View className="px-4 mb-8">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-semibold text-text">{t('recentListings', 'Recent Listings')}</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/(landlord)/my-listings')}>
                <Text className="text-brand font-medium">{t('viewAll', 'View All')}</Text>
              </TouchableOpacity>
            </View>
            {listings.slice(0, 3).map((listing, index) => (
              <Card
                key={listing.id || listing._id || `listing-${index}`}
                variant="elevated"
                padding="md"
                className="mb-3"
                onPress={() => router.push(`/(app)/(home)/listing/${listing.id || listing._id}`)}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-text" numberOfLines={1}>
                      {listing.address}
                    </Text>
                    <Text className="text-brand font-bold mt-1">
                      {formatCurrency(listing.price)}/mo
                    </Text>
                  </View>
                  <Badge variant={listing.is_active ? 'success' : 'default'}>
                    {listing.is_active ? t('status.active', 'Active') : t('status.inactive', 'Inactive')}
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
