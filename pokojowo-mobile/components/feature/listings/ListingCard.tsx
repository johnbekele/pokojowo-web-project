import { View, Text, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MapPin, Users, Maximize } from 'lucide-react-native';

import type { Listing } from '@/types/listing.types';
import { formatCurrency } from '@/lib/utils';
import { COLORS } from '@/lib/constants';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const { t, i18n } = useTranslation('listings');

  const description =
    listing.description?.[i18n.language as 'en' | 'pl'] ||
    listing.description?.en ||
    '';

  const imageUrl =
    listing.images?.[0] ||
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400';

  // Use id or _id (MongoDB returns _id)
  const listingId = listing.id || listing._id;

  return (
    <Link href={`/(app)/(home)/listing/${listingId}`} asChild>
      <TouchableOpacity
        className="bg-white rounded-xl shadow-sm mx-4 mb-4 overflow-hidden"
        style={{ width: CARD_WIDTH }}
        activeOpacity={0.9}
      >
        {/* Image */}
        <View className="relative">
          <Image
            source={{ uri: imageUrl }}
            className="w-full h-48"
            resizeMode="cover"
          />
          {/* Price badge */}
          <View className="absolute bottom-3 left-3 bg-white/95 px-3 py-1.5 rounded-lg">
            <Text className="text-primary-600 font-bold text-lg">
              {formatCurrency(listing.price)}
              <Text className="text-gray-500 font-normal text-sm">/mo</Text>
            </Text>
          </View>
          {/* Room type badge */}
          {listing.room_type && (
            <View className="absolute top-3 right-3 bg-primary-600 px-2.5 py-1 rounded-full">
              <Text className="text-white text-xs font-medium">
                {listing.room_type}
              </Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View className="p-4">
          {/* Address */}
          <View className="flex-row items-center mb-2">
            <MapPin size={16} color={COLORS.gray[500]} />
            <Text className="text-gray-900 font-semibold ml-1.5 flex-1" numberOfLines={1}>
              {listing.address}
            </Text>
          </View>

          {/* Description */}
          {description && (
            <Text className="text-gray-500 text-sm mb-3" numberOfLines={2}>
              {description}
            </Text>
          )}

          {/* Meta info */}
          <View className="flex-row items-center gap-4">
            {listing.size && (
              <View className="flex-row items-center">
                <Maximize size={14} color={COLORS.gray[400]} />
                <Text className="text-gray-500 text-sm ml-1">
                  {listing.size} m²
                </Text>
              </View>
            )}
            {listing.max_tenants && (
              <View className="flex-row items-center">
                <Users size={14} color={COLORS.gray[400]} />
                <Text className="text-gray-500 text-sm ml-1">
                  {t('card.maxTenants', 'Max {{count}}', { count: listing.max_tenants })}
                </Text>
              </View>
            )}
            {listing.building_type && (
              <Text className="text-gray-400 text-sm">
                {listing.building_type.replace('_', ' ')}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Link>
  );
}
