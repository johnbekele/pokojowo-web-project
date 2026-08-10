import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Linking,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Heart,
  MapPin,
  Maximize,
  MessageSquare,
  Phone,
  Share2,
  Users,
} from 'lucide-react-native';
import MapView, { Marker } from 'react-native-maps';

import { Avatar, Badge, Button, Card, Skeleton } from '@/components/ui';
import ShareSheet from '@/components/shared/ShareSheet';
import { useListing } from '@/hooks/listings/useListings';
import {
  useLikeListing,
  useMyInteractions,
  useTrackView,
  useUnlikeListing,
} from '@/hooks/listingInteractions/useListingInteractions';
import { useOpenChatWithUser } from '@/hooks/chat/useOpenChatWithUser';
import { formatCurrency, formatDate } from '@/lib/utils';
import { IMAGE_BASE_URL } from '@/lib/constants';
import type { Listing } from '@/types/listing.types';
import useTheme from '@/hooks/useTheme';
import useUIStore from '@/stores/uiStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200';

// A remount should not create another view event during the same app session.
const trackedViewIds = new Set<string>();

/** Convert an upload path to an absolute URL using the runtime-configured host. */
export const getImageUrl = (url: string): string => {
  if (!url) return FALLBACK_IMAGE;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (!IMAGE_BASE_URL) return url;
  return `${IMAGE_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

function allowsContact(methods: string[] | undefined, method: 'phone' | 'message') {
  // An omitted field is legacy data; preserve the native contact behaviour.
  if (methods === undefined) return true;
  const aliases = method === 'phone' ? ['phone', 'call', 'telephone'] : ['message', 'chat', 'email'];
  return methods.some((value) => aliases.includes(value.trim().toLowerCase()));
}

function getPhone(listing: Listing) {
  return listing.phone || listing.landlord?.phone || listing.owner?.phone;
}

function ListingDetailSkeleton() {
  return (
    <View className="flex-1 bg-bg">
      <Skeleton width="100%" height={320} radius={0} />
      <View className="gap-4 px-4 pt-5">
        <View className="flex-row items-center justify-between">
          <Skeleton width="42%" height={30} />
          <Skeleton width="26%" height={28} />
        </View>
        <Skeleton width="80%" height={20} />
        <View className="flex-row gap-3">
          <Skeleton width="30%" height={56} />
          <Skeleton width="30%" height={56} />
          <Skeleton width="30%" height={56} />
        </View>
        <Skeleton width="100%" height={130} radius={14} />
        <Skeleton width="100%" height={120} radius={14} />
      </View>
    </View>
  );
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation('listings');
  const { colors } = useTheme();
  const showToast = useUIStore((state) => state.showToast);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [shareVisible, setShareVisible] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const flatListRef = useRef<FlatList<string>>(null);

  const {
    data: listing,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useListing(id);
  const { data: interactions, isLoading: isInteractionLoading } = useMyInteractions(id);
  const { mutate: trackView } = useTrackView(id);
  const likeMutation = useLikeListing();
  const unlikeMutation = useUnlikeListing();
  const { openChat, isOpeningChat } = useOpenChatWithUser();

  useEffect(() => {
    if (!id || !listing || trackedViewIds.has(id)) return;
    trackedViewIds.add(id);
    trackView(undefined);
  }, [id, listing, trackView]);

  const isScraped = listing?.isScraped ?? listing?.is_scraped ?? false;
  const phoneNumber = listing ? getPhone(listing) : undefined;
  const contactMethods = listing?.can_be_contacted ?? listing?.canBeContacted;
  const phoneAllowed = Boolean(phoneNumber && allowsContact(contactMethods, 'phone'));
  const messageAllowed = allowsContact(contactMethods, 'message');
  const sourceUrl = listing?.sourceUrl ?? listing?.source_url;
  const sourceSite = listing?.sourceSite ?? listing?.source_site;
  const isLiked = Boolean(interactions?.has_liked);
  const isLikePending = likeMutation.isPending || unlikeMutation.isPending;

  const images = useMemo(
    () => (listing?.images?.length ? listing.images.map(getImageUrl) : [FALLBACK_IMAGE]),
    [listing?.images]
  );
  const language = i18n.language.toLowerCase().startsWith('pl') ? 'pl' : 'en';
  const description = listing?.description?.[language] || listing?.description?.en || '';
  const amenities = listing?.amenities ?? [];
  const coordinates = listing?.locationGeo?.coordinates;
  const hasCoordinates =
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    Number.isFinite(coordinates[0]) &&
    Number.isFinite(coordinates[1]);
  const owner = listing?.owner ?? listing?.landlord;
  const ownerName = owner
    ? owner.firstname
      ? `${owner.firstname} ${owner.lastname || ''}`.trim()
      : owner.username
    : '';

  const handleToggleLike = useCallback(() => {
    if (!id || isInteractionLoading || isLikePending) return;
    if (isLiked) unlikeMutation.mutate(id);
    else likeMutation.mutate(id);
  }, [id, isInteractionLoading, isLikePending, isLiked, likeMutation, unlikeMutation]);

  const handleCall = useCallback(async () => {
    if (!listing || !phoneNumber || !phoneAllowed) return;
    const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
    const phoneUrl = `tel:${cleanPhone}`;
    if (await Linking.canOpenURL(phoneUrl)) {
      await Linking.openURL(phoneUrl);
      return;
    }
    showToast({
      type: 'error',
      message: t('detail.callErrorMessage', { phone: cleanPhone }),
    });
  }, [listing, phoneNumber, phoneAllowed, showToast, t]);

  const handleCopyPhone = useCallback(async () => {
    if (!phoneNumber || !phoneAllowed) return;
    await Clipboard.setStringAsync(phoneNumber);
    showToast({ type: 'success', message: t('detail.phoneCopied') });
  }, [phoneNumber, phoneAllowed, showToast, t]);

  const handleViewOriginal = useCallback(async () => {
    if (!sourceUrl) return;
    if (await Linking.canOpenURL(sourceUrl)) {
      await Linking.openURL(sourceUrl);
      return;
    }
    showToast({ type: 'error', message: t('detail.linkErrorMessage') });
  }, [sourceUrl, showToast, t]);

  const handleContact = useCallback(() => {
    if (!listing) return;
    if (isScraped) {
      if (phoneAllowed) {
        void handleCall();
      } else if (sourceUrl) {
        void handleViewOriginal();
      }
      return;
    }
    if (listing.owner_id && messageAllowed) {
      openChat(listing.owner_id);
    } else {
      showToast({ type: 'info', message: t('detail.contactUnavailable') });
    }
  }, [
    listing,
    isScraped,
    phoneAllowed,
    sourceUrl,
    handleCall,
    handleViewOriginal,
    messageAllowed,
    openChat,
    showToast,
    t,
  ]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
        <ListingDetailSkeleton />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-bg px-6" edges={['top', 'bottom']}>
        <Text className="mb-2 text-center text-lg font-semibold text-text">
          {t('error.title')}
        </Text>
        <Text className="mb-5 text-center text-muted">{t('error.loadingFailed')}</Text>
        <Button onPress={() => void refetch()}>{t('error.retry')}</Button>
        <Button onPress={() => router.back()} variant="ghost" className="mt-2">
          {t('detail.goBack')}
        </Button>
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-bg px-6" edges={['top', 'bottom']}>
        <Text className="mb-5 text-center text-lg font-semibold text-text">
          {t('detail.notFound')}
        </Text>
        <Button onPress={() => router.back()} variant="outline">
          {t('detail.goBack')}
        </Button>
      </SafeAreaView>
    );
  }

  const shareUrl = `https://pokojowo.com/listing/${id}`;
  const shareMessage = t('detail.shareMessage', {
    address: listing.address,
    price: formatCurrency(listing.price),
    unit: t('card.month'),
  });
  const contactLabel = isScraped
    ? phoneAllowed
      ? t('detail.call')
      : sourceUrl
        ? t('detail.viewOriginal')
        : t('detail.contactUnavailable')
    : t('detail.message');
  const contactIcon = isScraped && phoneAllowed ? (
    <Phone size={18} color={colors.brandFg} />
  ) : isScraped ? (
    <ExternalLink size={18} color={colors.brandFg} />
  ) : (
    <MessageSquare size={18} color={colors.brandFg} />
  );

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <View className="flex-1">
        <View className="absolute left-4 right-4 top-2 z-10 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full bg-bg/90"
            accessibilityRole="button"
            accessibilityLabel={t('detail.goBack')}
          >
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={handleToggleLike}
              disabled={isInteractionLoading || isLikePending}
              className="h-11 w-11 items-center justify-center rounded-full bg-bg/90"
              accessibilityRole="button"
              accessibilityLabel={isLiked ? t('actions.unlike') : t('actions.like')}
            >
              <Heart
                size={21}
                color={isLiked ? colors.danger : colors.text}
                fill={isLiked ? colors.danger : 'none'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShareVisible(true)}
              className="h-11 w-11 items-center justify-center rounded-full bg-bg/90"
              accessibilityRole="button"
              accessibilityLabel={t('actions.share')}
            >
              <Share2 size={21} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 112 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isLoading}
              onRefresh={() => void refetch()}
              tintColor={colors.brand}
            />
          }
        >
          <View className="relative">
            <FlatList
              ref={flatListRef}
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setCurrentImageIndex(Math.max(0, Math.min(index, images.length - 1)));
              }}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item }}
                  style={{ width: SCREEN_WIDTH, height: 320 }}
                  contentFit="cover"
                  transition={180}
                  accessibilityRole="image"
                  accessibilityLabel={t('card.photoAlt', { location: listing.city || listing.address })}
                />
              )}
              keyExtractor={(item, index) => `${item}-${index}`}
            />
            <View className="absolute bottom-4 left-4 flex-row items-center rounded-full bg-black/55 px-3 py-1.5">
              <Text className="text-xs font-semibold text-white">
                {currentImageIndex + 1} / {images.length}
              </Text>
            </View>
            {images.length > 1 && (
              <View className="absolute bottom-5 left-0 right-0 flex-row justify-center gap-1.5">
                {images.map((image, index) => (
                  <View
                    key={`${image}-dot`}
                    className={`h-1.5 rounded-full ${
                      index === currentImageIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/55'
                    }`}
                  />
                ))}
              </View>
            )}
          </View>

          <View className="gap-6 px-4 pt-5">
            <View>
              <View className="mb-2 flex-row items-start justify-between gap-3">
                <Text className="flex-1 text-3xl font-bold text-brand">
                  {formatCurrency(listing.price)}
                  <Text className="text-base font-normal text-muted">/{t('card.month')}</Text>
                </Text>
                <View className="flex-row flex-wrap justify-end gap-2">
                  {listing.offeredBy === 'owner' && (
                    <Badge variant="default">{t('detail.privateOwner')}</Badge>
                  )}
                  {listing.offeredBy === 'agency' && (
                    <Badge variant="primary">{t('detail.agency')}</Badge>
                  )}
                  {isScraped && <Badge variant="default">{t('card.imported')}</Badge>}
                </View>
              </View>
              <View className="flex-row items-start">
                <MapPin size={18} color={colors.muted} />
                <Text className="ml-2 flex-1 text-base leading-6 text-text">
                  {[listing.district, listing.city].filter(Boolean).join(', ')}
                  {listing.district || listing.city ? ' · ' : ''}
                  {listing.address}
                </Text>
              </View>
            </View>

            <Card variant="outlined" padding="md">
              <View className="flex-row flex-wrap">
                {listing.size !== undefined && (
                  <View className="mb-3 w-1/2 flex-row items-center">
                    <Maximize size={17} color={colors.brand} />
                    <View className="ml-2">
                      <Text className="text-xs text-muted">{t('details.size')}</Text>
                      <Text className="font-semibold text-text">{listing.size} m²</Text>
                    </View>
                  </View>
                )}
                {listing.max_tenants !== undefined && (
                  <View className="mb-3 w-1/2 flex-row items-center">
                    <Users size={17} color={colors.brand} />
                    <View className="ml-2">
                      <Text className="text-xs text-muted">{t('detail.maxTenants')}</Text>
                      <Text className="font-semibold text-text">{listing.max_tenants}</Text>
                    </View>
                  </View>
                )}
                {listing.available_from && (
                  <View className="w-1/2 flex-row items-center">
                    <Calendar size={17} color={colors.brand} />
                    <View className="ml-2">
                      <Text className="text-xs text-muted">{t('details.available')}</Text>
                      <Text className="font-semibold text-text">
                        {formatDate(listing.available_from)}
                      </Text>
                    </View>
                  </View>
                )}
                {listing.room_type && (
                  <View className="w-1/2 flex-row items-center">
                    <View className="h-[17px] w-[17px] items-center justify-center rounded-full bg-brand">
                      <Text className="text-[10px] font-bold text-brand-fg">R</Text>
                    </View>
                    <View className="ml-2">
                      <Text className="text-xs text-muted">{t('filters.roomType')}</Text>
                      <Text className="font-semibold text-text">{listing.room_type}</Text>
                    </View>
                  </View>
                )}
              </View>
            </Card>

            {description && (
              <View>
                <Text className="mb-2 text-xl font-semibold text-text">
                  {t('detail.description')}
                </Text>
                <Text
                  className="text-base leading-6 text-muted"
                  numberOfLines={descriptionExpanded ? undefined : 5}
                >
                  {description}
                </Text>
                {description.length > 260 && (
                  <TouchableOpacity
                    onPress={() => setDescriptionExpanded((expanded) => !expanded)}
                    className="mt-2 flex-row items-center self-start"
                    accessibilityRole="button"
                    accessibilityLabel={
                      descriptionExpanded ? t('detail.showLess') : t('detail.readMore')
                    }
                  >
                    <Text className="font-semibold text-brand">
                      {descriptionExpanded ? t('detail.showLess') : t('detail.readMore')}
                    </Text>
                    {descriptionExpanded ? (
                      <ChevronUp size={16} color={colors.brand} />
                    ) : (
                      <ChevronDown size={16} color={colors.brand} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {amenities.length > 0 && (
              <View>
                <Text className="mb-3 text-xl font-semibold text-text">
                  {t('detail.amenities')}
                </Text>
                <View className="-mx-1 flex-row flex-wrap">
                  {amenities.map((amenity, index) => (
                    <View key={`${amenity}-${index}`} className="mb-2 w-1/2 px-1">
                      <View className="flex-row items-center rounded-xl bg-surface px-3 py-3">
                        <Check size={16} color={colors.brand} />
                        <Text className="ml-2 flex-1 text-sm text-text">{amenity}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {hasCoordinates && coordinates && (
              <View>
                <Text className="mb-3 text-xl font-semibold text-text">
                  {t('details.location')}
                </Text>
                <View className="h-52 overflow-hidden rounded-2xl border border-border">
                  <MapView
                    style={{ flex: 1, backgroundColor: colors.surface }}
                    initialRegion={{
                      latitude: coordinates[1],
                      longitude: coordinates[0],
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    pitchEnabled={false}
                    rotateEnabled={false}
                    accessibilityLabel={t('details.location')}
                  >
                    <Marker
                      coordinate={{ latitude: coordinates[1], longitude: coordinates[0] }}
                      pinColor={colors.brand}
                      title={listing.address}
                    />
                  </MapView>
                </View>
              </View>
            )}

            <View>
              <Text className="mb-3 text-xl font-semibold text-text">{t('detail.details')}</Text>
              <Card variant="outlined" padding="md">
                <View className="flex-row justify-between border-b border-border py-2">
                  <Text className="text-muted">{t('filters.buildingType')}</Text>
                  <Text className="font-medium text-text">
                    {listing.building_type?.replace('_', ' ') || t('detail.notAvailable')}
                  </Text>
                </View>
                {listing.floor !== undefined && (
                  <View className="flex-row justify-between border-b border-border py-2">
                    <Text className="text-muted">{t('details.floor')}</Text>
                    <Text className="font-medium text-text">{listing.floor}</Text>
                  </View>
                )}
                {listing.rent_for && (
                  <View className="flex-row justify-between py-2">
                    <Text className="text-muted">{t('filters.rentFor')}</Text>
                    <Text className="max-w-[58%] text-right font-medium text-text">
                      {listing.rent_for}
                    </Text>
                  </View>
                )}
              </Card>
            </View>

            {owner && !isScraped && (
              <View>
                <Text className="mb-3 text-xl font-semibold text-text">{t('detail.landlord')}</Text>
                <Card variant="outlined" padding="md">
                  <View className="flex-row items-center">
                    <Avatar source={owner.photo} name={ownerName} size="lg" />
                    <View className="ml-3 flex-1">
                      <Text className="text-base font-semibold text-text">{ownerName}</Text>
                      {((owner as { is_verified?: boolean; isVerified?: boolean }).is_verified ||
                        (owner as { isVerified?: boolean }).isVerified) && (
                        <Badge variant="success" size="sm" className="mt-1">
                          {t('detail.verifiedHost')}
                        </Badge>
                      )}
                    </View>
                    {listing.offeredBy === 'agency' && (
                      <Badge variant="primary">{t('detail.agency')}</Badge>
                    )}
                  </View>
                </Card>
              </View>
            )}

            <View>
              <Text className="mb-3 text-xl font-semibold text-text">
                {t('detail.contactInfo')}
              </Text>
              <Card variant="outlined" padding="md">
                {phoneNumber && phoneAllowed ? (
                  <View className="flex-row items-center border-b border-border py-1 pb-3">
                    <TouchableOpacity
                      onPress={() => void handleCall()}
                      className="flex-1 flex-row items-center"
                      accessibilityRole="button"
                      accessibilityLabel={t('detail.tapToCall')}
                    >
                      <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-surface">
                        <Phone size={20} color={colors.success} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs text-muted">{t('detail.phoneNumber')}</Text>
                        <Text className="text-base font-medium text-text">{phoneNumber}</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => void handleCopyPhone()}
                      className="items-center px-1"
                      accessibilityRole="button"
                      accessibilityLabel={t('detail.copyPhone')}
                    >
                      <Copy size={18} color={colors.brand} />
                      <Text className="mt-1 text-xs font-medium text-brand">
                        {t('detail.copyPhone')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="flex-row items-center border-b border-border py-1 pb-3">
                    <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-surface">
                      <Phone size={20} color={colors.muted} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-muted">{t('detail.phoneNumber')}</Text>
                      <Text className="text-muted">
                        {phoneNumber ? t('detail.contactRestricted') : t('detail.notProvided')}
                      </Text>
                    </View>
                  </View>
                )}

                {isScraped && sourceUrl && (
                  <TouchableOpacity
                    onPress={() => void handleViewOriginal()}
                    className="mt-3 flex-row items-center"
                    accessibilityRole="link"
                    accessibilityLabel={t('detail.originalListing')}
                  >
                    <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-surface">
                      <ExternalLink size={20} color={colors.brand} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-muted">{t('detail.originalListing')}</Text>
                      <Text className="font-medium capitalize text-brand">
                        {sourceSite || t('detail.viewOnSource')}
                      </Text>
                    </View>
                    <ExternalLink size={18} color={colors.brand} />
                  </TouchableOpacity>
                )}

                {isScraped && (
                  <View className="mt-3 rounded-xl bg-surface p-3">
                    <Text className="text-sm leading-5 text-muted">{t('detail.scrapedNotice')}</Text>
                  </View>
                )}
              </Card>
            </View>
          </View>
        </ScrollView>

        <View className="border-t border-border bg-bg px-4 pb-2 pt-3">
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={handleToggleLike}
              disabled={isInteractionLoading || isLikePending}
              className="h-12 w-12 items-center justify-center rounded-lg border border-border bg-card"
              accessibilityRole="button"
              accessibilityLabel={isLiked ? t('actions.unlike') : t('actions.like')}
              accessibilityState={{ disabled: isInteractionLoading || isLikePending, selected: isLiked }}
              testID="listing-like-button"
            >
              <Heart
                size={23}
                color={isLiked ? colors.danger : colors.text}
                fill={isLiked ? colors.danger : 'none'}
              />
            </TouchableOpacity>
            <Button
              variant="outline"
              className="flex-1"
              onPress={() => setShareVisible(true)}
              icon={<Share2 size={18} color={colors.text} />}
            >
              {t('actions.share')}
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              loading={isOpeningChat}
              disabled={(!isScraped && (!listing.owner_id || !messageAllowed)) ||
                (isScraped && !phoneAllowed && !sourceUrl)}
              icon={contactIcon}
              onPress={handleContact}
            >
              {contactLabel}
            </Button>
          </View>
        </View>
      </View>

      <ShareSheet
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        url={shareUrl}
        message={shareMessage}
        title={listing.address}
      />
    </SafeAreaView>
  );
}
