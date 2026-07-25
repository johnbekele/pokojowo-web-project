import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Share,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Heart,
  Share2,
  MapPin,
  Users,
  Maximize,
  Calendar,
  MessageSquare,
  Phone,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react-native';

import MapView, { Marker } from 'react-native-maps';

import { Button, Badge, Avatar, LoadingSpinner, Card } from '@/components/ui';
import { useListing } from '@/hooks/listings/useListings';
import { useSaveListing, useUnsaveListing, useIsListingSaved } from '@/hooks/favorites/useFavorites';
import { useTrackView } from '@/hooks/listingInteractions/useListingInteractions';
import { formatCurrency, formatDate } from '@/lib/utils';
import { IMAGE_BASE_URL } from '@/lib/constants';
import useTheme from '@/hooks/useTheme';
import useUIStore from '@/stores/uiStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Convert image URL to absolute URL if it's a relative path
 */
const getImageUrl = (url: string): string => {
  if (!url) return 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800';
  // If already absolute URL, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Prepend base URL for relative paths
  return `${IMAGE_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation('listings');
  const { colors } = useTheme();
  const showToast = useUIStore((s) => s.showToast);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const { data: listing, isLoading, error } = useListing(id);
  const { data: isSaved } = useIsListingSaved(id);
  const { mutate: saveListing } = useSaveListing();
  const { mutate: unsaveListing } = useUnsaveListing();
  const { mutate: trackView } = useTrackView(id);

  // Track view when listing is loaded
  useEffect(() => {
    if (id && listing) {
      trackView(undefined); // Fire and forget
    }
  }, [id, listing]);

  const handleToggleSave = () => {
    if (isSaved) {
      unsaveListing(id);
    } else {
      saveListing(id);
    }
  };

  const handleContact = () => {
    if (listing?.owner_id) {
      router.push(`/(app)/(chat)/${listing.owner_id}`);
    }
  };

  const handleShare = async () => {
    if (!listing) return;
    try {
      await Share.share({
        title: listing.address,
        message: `Check out this listing: ${listing.address} - ${formatCurrency(listing.price)}/mo\n\nhttps://pokojowo.com/listing/${id}`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleCall = async () => {
    // Check multiple possible locations for phone number
    const landlord = listing?.landlord || listing?.owner;
    const phone = landlord?.phone || listing?.phone;

    if (phone) {
      // Remove any spaces or special characters except + and digits
      const cleanPhone = phone.replace(/[^\d+]/g, '');
      const phoneUrl = `tel:${cleanPhone}`;

      const canOpen = await Linking.canOpenURL(phoneUrl);
      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        showToast({
          type: 'error',
          message: t('detail.callErrorMessage', 'Unable to open phone app. Phone: {{phone}}', {
            phone: cleanPhone,
          }),
        });
      }
    } else {
      showToast({
        type: 'info',
        message: t(
          'detail.noPhoneMessage',
          'The owner has not provided a phone number. Try sending a message instead.'
        ),
      });
    }
  };

  const handleViewOriginal = async () => {
    if (listing?.sourceUrl) {
      const canOpen = await Linking.canOpenURL(listing.sourceUrl);
      if (canOpen) {
        await Linking.openURL(listing.sourceUrl);
      } else {
        showToast({
          type: 'error',
          message: t('detail.linkErrorMessage', 'Unable to open the original listing.'),
        });
      }
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-bg">
        <LoadingSpinner fullScreen />
      </SafeAreaView>
    );
  }

  if (error || !listing) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <Text className="text-muted">Listing not found</Text>
        <Button onPress={() => router.back()} variant="ghost" className="mt-4">
          Go Back
        </Button>
      </SafeAreaView>
    );
  }

  const images = listing.images?.length
    ? listing.images.map(getImageUrl)
    : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'];

  // Get phone number from various possible sources
  const phoneNumber = listing.phone || listing.landlord?.phone || listing.owner?.phone;

  // Check if this is a scraped listing
  const isScraped = listing.isScraped;
  const sourceUrl = listing.sourceUrl;
  const sourceSite = listing.sourceSite;

  const description =
    listing.description?.[i18n.language as 'en' | 'pl'] ||
    listing.description?.en ||
    '';

  const amenities = listing.amenities || [];

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View className="relative">
          <FlatList
            ref={flatListRef}
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setCurrentImageIndex(index);
            }}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                style={{ width: SCREEN_WIDTH, height: 300 }}
                resizeMode="cover"
              />
            )}
            keyExtractor={(_, index) => index.toString()}
          />

          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute top-4 left-4 bg-white/90 rounded-full p-2"
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>

          {/* Action buttons */}
          <View className="absolute top-4 right-4 flex-row gap-2">
            <TouchableOpacity
              onPress={handleToggleSave}
              className="bg-white/90 rounded-full p-2"
            >
              <Heart
                size={24}
                color={isSaved ? colors.danger : colors.text}
                fill={isSaved ? colors.danger : 'none'}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} className="bg-white/90 rounded-full p-2">
              <Share2 size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Image pagination */}
          {images.length > 1 && (
            <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-1.5">
              {images.map((_, index) => (
                <View
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </View>
          )}
        </View>

        {/* Content */}
        <View className="p-4">
          {/* Price and type */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-2xl font-bold text-brand">
              {formatCurrency(listing.price)}
              <Text className="text-base font-normal text-muted">/mo</Text>
            </Text>
            <View className="flex-row items-center gap-2">
              {(listing.offeredBy === 'owner' || listing.offeredBy === 'agency') && (
                <Badge variant="default">
                  {listing.offeredBy === 'owner'
                    ? t('detail.privateOwner', 'Private owner')
                    : t('detail.agency', 'Agency')}
                </Badge>
              )}
              {listing.room_type && (
                <Badge variant="primary">{listing.room_type}</Badge>
              )}
            </View>
          </View>

          {/* Address */}
          <View className="flex-row items-center mb-4">
            <MapPin size={18} color={colors.muted} />
            <Text className="text-text ml-2 flex-1">
              {[listing.district, listing.city].filter(Boolean).join(', ')}
              {(listing.district || listing.city) ? ' · ' : ''}
              {listing.address}
            </Text>
          </View>

          {/* Map */}
          {listing.locationGeo?.coordinates && (
            <View className="mb-4 rounded-xl overflow-hidden border border-border" style={{ height: 200 }}>
              <MapView
                style={{ flex: 1 }}
                initialRegion={{
                  latitude: listing.locationGeo.coordinates[1],
                  longitude: listing.locationGeo.coordinates[0],
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                <Marker
                  coordinate={{
                    latitude: listing.locationGeo.coordinates[1],
                    longitude: listing.locationGeo.coordinates[0],
                  }}
                />
              </MapView>
            </View>
          )}

          {/* Quick info */}
          <View className="flex-row flex-wrap gap-4 mb-6">
            {listing.size && (
              <View className="flex-row items-center">
                <Maximize size={16} color={colors.muted} />
                <Text className="text-muted ml-1.5">{listing.size} m²</Text>
              </View>
            )}
            {listing.max_tenants && (
              <View className="flex-row items-center">
                <Users size={16} color={colors.muted} />
                <Text className="text-muted ml-1.5">
                  Max {listing.max_tenants} {listing.max_tenants === 1 ? 'tenant' : 'tenants'}
                </Text>
              </View>
            )}
            {listing.available_from && (
              <View className="flex-row items-center">
                <Calendar size={16} color={colors.muted} />
                <Text className="text-muted ml-1.5">
                  From {formatDate(listing.available_from)}
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          {description && (
            <View className="mb-6">
              <Text className="text-lg font-semibold text-text mb-2">
                {t('detail.description', 'Description')}
              </Text>
              <Text className="text-muted leading-6">{description}</Text>
            </View>
          )}

          {/* Amenities */}
          {amenities.length > 0 && (
            <View className="mb-6">
              <Text className="text-lg font-semibold text-text mb-3">
                {t('detail.amenities', 'Amenities')}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {amenities.map((amenity, index) => (
                  <Badge key={index} variant="default">
                    {amenity}
                  </Badge>
                ))}
              </View>
            </View>
          )}

          {/* Building info */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-text mb-3">
              {t('detail.details', 'Details')}
            </Text>
            <Card variant="outlined" padding="md">
              <View className="flex-row justify-between py-2 border-b border-border">
                <Text className="text-muted">Building Type</Text>
                <Text className="text-text font-medium">
                  {listing.building_type?.replace('_', ' ') || 'N/A'}
                </Text>
              </View>
              {listing.floor && (
                <View className="flex-row justify-between py-2 border-b border-border">
                  <Text className="text-muted">Floor</Text>
                  <Text className="text-text font-medium">{listing.floor}</Text>
                </View>
              )}
              {listing.rent_for && (
                <View className="flex-row justify-between py-2">
                  <Text className="text-muted">Preferred Tenant</Text>
                  <Text className="text-text font-medium">{listing.rent_for}</Text>
                </View>
              )}
            </Card>
          </View>

          {/* Landlord */}
          {listing.owner && !isScraped && (
            <View className="mb-6">
              <Text className="text-lg font-semibold text-text mb-3">
                {t('detail.landlord', 'Landlord')}
              </Text>
              <Card variant="outlined" padding="md">
                <View className="flex-row items-center">
                  <Avatar
                    source={listing.owner.photo}
                    name={listing.owner.firstname || listing.owner.username || ''}
                    size="lg"
                  />
                  <View className="flex-1 ml-3">
                    <Text className="text-base font-semibold text-text">
                      {listing.owner.firstname
                        ? `${listing.owner.firstname} ${listing.owner.lastname || ''}`.trim()
                        : listing.owner.username}
                    </Text>
                    {(listing.owner as any).trustLevel === 'id_verified' || (listing.owner as any).isVerifiedLandlord ? (
                      <Badge variant="primary" size="sm" className="mt-1">
                        {t('detail.idVerifiedHost', 'ID Verified host')}
                      </Badge>
                    ) : (listing.owner as any).trustLevel === 'verified' ? (
                      <Badge variant="success" size="sm" className="mt-1">
                        {t('detail.verifiedHost', 'Verified host')}
                      </Badge>
                    ) : null}
                  </View>
                </View>
              </Card>
            </View>
          )}

          {/* Contact Information */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-text mb-3">
              {t('detail.contactInfo', 'Contact Information')}
            </Text>
            <Card variant="outlined" padding="md">
              {/* Phone Number */}
              {phoneNumber ? (
                <TouchableOpacity
                  onPress={handleCall}
                  className="flex-row items-center py-2 border-b border-border"
                >
                  <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center mr-3">
                    <Phone size={20} color={colors.success} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-muted text-sm">{t('detail.phoneNumber', 'Phone Number')}</Text>
                    <Text className="text-text font-medium text-base">{phoneNumber}</Text>
                  </View>
                  <Text className="text-brand font-medium">{t('detail.tapToCall', 'Tap to call')}</Text>
                </TouchableOpacity>
              ) : (
                <View className="flex-row items-center py-2 border-b border-border">
                  <View className="w-10 h-10 rounded-full bg-surface items-center justify-center mr-3">
                    <Phone size={20} color={colors.muted} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-muted text-sm">{t('detail.phoneNumber', 'Phone Number')}</Text>
                    <Text className="text-muted">{t('detail.notProvided', 'Not provided')}</Text>
                  </View>
                </View>
              )}

              {/* Source Link for Scraped Listings */}
              {isScraped && sourceUrl && (
                <TouchableOpacity
                  onPress={handleViewOriginal}
                  className="flex-row items-center py-2 mt-2"
                >
                  <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                    <ExternalLink size={20} color={colors.brand} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-muted text-sm">{t('detail.originalListing', 'Original Listing')}</Text>
                    <Text className="text-brand font-medium capitalize">
                      {sourceSite || t('detail.viewOnSource', 'View on source')}
                    </Text>
                  </View>
                  <ExternalLink size={18} color={colors.brand} />
                </TouchableOpacity>
              )}

              {/* Scraped listing notice */}
              {isScraped && (
                <View className="mt-3 p-3 bg-amber-50 rounded-lg">
                  <Text className="text-amber-800 text-sm">
                    {t('detail.scrapedNotice', 'This listing was imported from an external source. Contact the landlord directly through the original website or phone number.')}
                  </Text>
                </View>
              )}
            </Card>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View className="p-4 border-t border-border bg-bg flex-row gap-3">
        {phoneNumber && (
          <Button
            variant="outline"
            className="flex-1"
            icon={<Phone size={18} color={colors.success} />}
            onPress={handleCall}
          >
            {t('detail.call', 'Call')}
          </Button>
        )}
        {isScraped && sourceUrl ? (
          <Button
            variant="primary"
            className="flex-1"
            icon={<ExternalLink size={18} color="white" />}
            onPress={handleViewOriginal}
          >
            {t('detail.viewOriginal', 'View Original')}
          </Button>
        ) : (
          <Button
            variant="primary"
            className="flex-1"
            icon={<MessageSquare size={18} color="white" />}
            onPress={handleContact}
          >
            {t('detail.message', 'Message')}
          </Button>
        )}
      </View>
    </SafeAreaView>
  );
}
