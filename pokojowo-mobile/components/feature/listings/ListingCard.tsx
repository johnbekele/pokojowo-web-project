import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MapPin, Users, Maximize } from 'lucide-react-native';

import type { Listing } from '@/types/listing.types';
import { formatCurrency } from '@/lib/utils';
import { getImageUrl } from '@/lib/image';
import useTheme from '@/hooks/useTheme';
import ListingLikeButton from './ListingLikeButton';

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const { t, i18n } = useTranslation('listings');
  const { colors } = useTheme();

  const description =
    listing.description?.[i18n.language as 'en' | 'pl'] || listing.description?.en || '';
  const imageUrl = getImageUrl(listing.images?.[0]);
  const listingId = listing.id || listing._id || '';
  const roomType = listing.room_type || listing.roomType;
  const buildingType = listing.building_type || listing.buildingType;
  const roomLabelKey = roomType
    ? `filters.roomTypes.${({ Single: 'single', Double: 'double', Suite: 'suite', private: 'private', shared: 'shared', studio: 'studio' } as Record<string, string>)[roomType] || roomType.toLowerCase()}`
    : '';
  const buildingLabelKey = buildingType
    ? `filters.buildingTypes.${({ Apartment: 'apartment', Loft: 'loft', Block: 'block', Detached_House: 'house', house: 'house' } as Record<string, string>)[buildingType] || buildingType.toLowerCase()}`
    : '';

  return (
    <Link href={`/(app)/(home)/listing/${listingId}`} asChild>
      <TouchableOpacity
        className="bg-card border border-border rounded-2xl mx-4 mb-4 overflow-hidden"
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={t('card.viewDetails', 'View listing details')}
      >
        <View className="relative">
          <Image
            source={{ uri: imageUrl }}
            style={{ width: '100%', height: 192 }}
            contentFit="cover"
            transition={200}
            accessible
            accessibilityLabel={t('card.photoAlt', {
              location:
                [listing.district, listing.city].filter(Boolean).join(', ') || t('title'),
            })}
          />
          <View className="absolute bottom-3 left-3 bg-black/60 px-3 py-1.5 rounded-lg">
            <Text className="text-white font-bold text-lg">
              {formatCurrency(listing.price)}
              <Text className="text-white/80 font-normal text-sm">/mo</Text>
            </Text>
          </View>

          <View className="absolute top-3 right-3">
            <ListingLikeButton
              listingId={listingId}
              size={22}
              className="bg-black/40 rounded-full p-2"
            />
          </View>

          {roomType && (
            <View className="absolute top-3 left-3 bg-brand px-2.5 py-1 rounded-full">
              <Text className="text-brand-fg text-xs font-medium">{t(roomLabelKey, roomType)}</Text>
            </View>
          )}
          {listing.isScraped && (
            <View className="absolute top-12 left-3 bg-black/60 px-2.5 py-1 rounded-full">
              <Text className="text-white text-xs font-medium">
                {t('card.imported', 'Imported listing')}
              </Text>
            </View>
          )}
        </View>

        <View className="p-4">
          <View className="flex-row items-center mb-2">
            <MapPin size={16} color={colors.muted} />
            <Text className="text-text font-semibold ml-1.5 flex-1" numberOfLines={1}>
              {[listing.district, listing.city].filter(Boolean).join(', ') || listing.address}
            </Text>
          </View>

          {description ? (
            <Text className="text-muted text-sm mb-3" numberOfLines={2}>
              {description}
            </Text>
          ) : null}

          <View className="flex-row items-center gap-4">
            {listing.size ? (
              <View className="flex-row items-center">
                <Maximize size={14} color={colors.muted} />
                <Text className="text-muted text-sm ml-1">{listing.size} m²</Text>
              </View>
            ) : null}
            {(listing.max_tenants ?? listing.maxTenants) ? (
              <View className="flex-row items-center">
                <Users size={14} color={colors.muted} />
                <Text className="text-muted text-sm ml-1">
                  {t('card.maxTenants', 'Max {{count}}', { count: listing.max_tenants ?? listing.maxTenants })}
                </Text>
              </View>
            ) : null}
            {buildingType ? (
              <Text className="text-muted text-sm">
                {t(buildingLabelKey, buildingType.replace('_', ' '))}
              </Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    </Link>
  );
}
