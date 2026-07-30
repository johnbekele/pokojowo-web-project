import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Image as ImageIcon, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { Button, Input, Badge } from '@/components/ui';
import KeyboardAwareScrollView from '@/components/shared/KeyboardAwareScrollView';
import { useUploadListingImages } from '@/hooks/listings/useListings';
import useUIStore from '@/stores/uiStore';
import useTheme from '@/hooks/useTheme';
import { getImageUrl } from '@/lib/image';
import { ROOM_TYPES, BUILDING_TYPES } from '@/lib/constants';
import type { CreateListingData } from '@/types/listing.types';

const listingSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  price: z.string().min(1, 'Price is required'),
  size: z.string().optional(),
  room_type: z.string().optional(),
  building_type: z.string().optional(),
  max_tenants: z.string().optional(),
  floor: z.string().optional(),
  description_en: z.string().optional(),
  description_pl: z.string().optional(),
});

export type ListingFormValues = z.infer<typeof listingSchema>;

interface ListingFormProps {
  initialValues?: Partial<ListingFormValues>;
  initialImages?: string[];
  submitLabel: string;
  submitting: boolean;
  onSubmit: (data: CreateListingData) => void;
}

export default function ListingForm({
  initialValues,
  initialImages = [],
  submitLabel,
  submitting,
  onSubmit,
}: ListingFormProps) {
  const { t } = useTranslation('landlord');
  const { colors } = useTheme();
  const showToast = useUIStore((s) => s.showToast);

  // Images are kept as hosted (server) URLs so submit always sends real URLs.
  const [images, setImages] = useState<string[]>(initialImages);
  const { mutate: uploadImages, isPending: isUploading } = useUploadListingImages();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      address: '',
      price: '',
      size: '',
      room_type: '',
      building_type: '',
      max_tenants: '',
      floor: '',
      description_en: '',
      description_pl: '',
      ...initialValues,
    },
  });

  const handlePickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast({ type: 'warning', message: t('create.permissionMessage', 'Please grant camera roll permissions') });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10 - images.length,
    });
    if (result.canceled) return;

    uploadImages(
      result.assets.map((a) => a.uri),
      {
        onSuccess: (urls) => setImages((prev) => [...prev, ...urls]),
        onError: () =>
          showToast({ type: 'error', message: t('create.imageError', 'Failed to upload images') }),
      }
    );
  };

  const removeImage = (index: number) => setImages(images.filter((_, i) => i !== index));

  const submit = (data: ListingFormValues) => {
    onSubmit({
      address: data.address,
      price: parseFloat(data.price),
      size: data.size ? parseFloat(data.size) : undefined,
      room_type: data.room_type || undefined,
      building_type: data.building_type || undefined,
      max_tenants: data.max_tenants ? parseInt(data.max_tenants, 10) : undefined,
      floor: data.floor ? parseInt(data.floor, 10) : undefined,
      description: { en: data.description_en || '', pl: data.description_pl || '' },
      images,
    });
  };

  const roomTypes = Object.values(ROOM_TYPES);
  const buildingTypes = Object.values(BUILDING_TYPES);

  return (
    <KeyboardAwareScrollView>
      {/* Images */}
      <View className="mb-6">
        <Text className="text-base font-semibold text-text mb-3">{t('create.photos', 'Photos')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            onPress={handlePickImages}
            disabled={isUploading || images.length >= 10}
            className="w-24 h-24 rounded-xl bg-surface items-center justify-center mr-3 border-2 border-dashed border-border"
          >
            {isUploading ? (
              <ActivityIndicator color={colors.brand} />
            ) : (
              <>
                <ImageIcon size={24} color={colors.muted} />
                <Text className="text-xs text-muted mt-1">{t('create.addPhoto', 'Add')}</Text>
              </>
            )}
          </TouchableOpacity>
          {images.map((url, index) => (
            <View key={`${url}-${index}`} className="relative mr-3">
              <Image
                source={{ uri: getImageUrl(url) }}
                style={{ width: 96, height: 96, borderRadius: 12 }}
                contentFit="cover"
                transition={150}
              />
              <TouchableOpacity
                onPress={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-danger rounded-full p-1"
              >
                <X size={14} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>

      <Controller
        control={control}
        name="address"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label={t('create.address', 'Address')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.address?.message}
            placeholder="e.g., ul. Marszalkowska 1, Warsaw"
          />
        )}
      />

      <View className="flex-row gap-4">
        <View className="flex-1">
          <Controller
            control={control}
            name="price"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('create.price', 'Price (PLN/mo)')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.price?.message}
                keyboardType="number-pad"
                placeholder="e.g., 2500"
              />
            )}
          />
        </View>
        <View className="flex-1">
          <Controller
            control={control}
            name="size"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('create.size', 'Size (m²)')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="number-pad"
                placeholder="e.g., 25"
              />
            )}
          />
        </View>
      </View>

      {/* Room type */}
      <View className="mb-4">
        <Text className="text-text mb-2 font-medium">{t('create.roomType', 'Room Type')}</Text>
        <Controller
          control={control}
          name="room_type"
          render={({ field: { onChange, value } }) => (
            <View className="flex-row flex-wrap gap-2">
              {roomTypes.map((type) => (
                <TouchableOpacity key={type} onPress={() => onChange(value === type ? '' : type)}>
                  <Badge variant={value === type ? 'primary' : 'default'}>{type}</Badge>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
      </View>

      {/* Building type */}
      <View className="mb-4">
        <Text className="text-text mb-2 font-medium">{t('create.buildingType', 'Building Type')}</Text>
        <Controller
          control={control}
          name="building_type"
          render={({ field: { onChange, value } }) => (
            <View className="flex-row flex-wrap gap-2">
              {buildingTypes.map((type) => (
                <TouchableOpacity key={type} onPress={() => onChange(value === type ? '' : type)}>
                  <Badge variant={value === type ? 'primary' : 'default'}>{type.replace('_', ' ')}</Badge>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
      </View>

      <View className="flex-row gap-4">
        <View className="flex-1">
          <Controller
            control={control}
            name="max_tenants"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('create.maxTenants', 'Max Tenants')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="number-pad"
                placeholder="e.g., 2"
              />
            )}
          />
        </View>
        <View className="flex-1">
          <Controller
            control={control}
            name="floor"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('create.floor', 'Floor')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="number-pad"
                placeholder="e.g., 3"
              />
            )}
          />
        </View>
      </View>

      <Controller
        control={control}
        name="description_en"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label={t('create.descriptionEn', 'Description (English)')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            multiline
            numberOfLines={4}
            style={{ height: 100, textAlignVertical: 'top' }}
            placeholder="Describe your listing..."
          />
        )}
      />

      <Controller
        control={control}
        name="description_pl"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label={t('create.descriptionPl', 'Description (Polish)')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            multiline
            numberOfLines={4}
            style={{ height: 100, textAlignVertical: 'top' }}
            placeholder="Opisz swoje mieszkanie..."
          />
        )}
      />

      <Button
        onPress={handleSubmit(submit)}
        loading={submitting}
        disabled={isUploading}
        fullWidth
        className="mt-4 mb-8"
      >
        {submitLabel}
      </Button>
    </KeyboardAwareScrollView>
  );
}
