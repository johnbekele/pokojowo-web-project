import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Image as ImageIcon, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { Button, Input, Badge } from '@/components/ui';
import { useCreateListing } from '@/hooks/listings/useListings';
import { ROOM_TYPES, BUILDING_TYPES, RENT_FOR, COLORS } from '@/lib/constants';

const listingSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  price: z.string().min(1, 'Price is required'),
  size: z.string().optional(),
  room_type: z.string().optional(),
  building_type: z.string().optional(),
  max_tenants: z.string().optional(),
  floor: z.string().optional(),
  rent_for: z.string().optional(),
  description_en: z.string().optional(),
  description_pl: z.string().optional(),
});

type ListingForm = z.infer<typeof listingSchema>;

export default function CreateListingScreen() {
  const { t } = useTranslation('landlord');
  const router = useRouter();

  const [images, setImages] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);

  const { mutate: createListing, isPending } = useCreateListing();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ListingForm>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      address: '',
      price: '',
      size: '',
      room_type: '',
      building_type: '',
      max_tenants: '',
      floor: '',
      rent_for: '',
      description_en: '',
      description_pl: '',
    },
  });

  const handlePickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10 - images.length,
    });

    if (!result.canceled) {
      setImages([...images, ...result.assets.map((a) => a.uri)]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const onSubmit = (data: ListingForm) => {
    createListing(
      {
        address: data.address,
        price: parseFloat(data.price),
        size: data.size ? parseFloat(data.size) : undefined,
        room_type: data.room_type || undefined,
        building_type: data.building_type || undefined,
        max_tenants: data.max_tenants ? parseInt(data.max_tenants, 10) : undefined,
        floor: data.floor ? parseInt(data.floor, 10) : undefined,
        rent_for: data.rent_for || undefined,
        description: {
          en: data.description_en || '',
          pl: data.description_pl || '',
        },
        amenities,
        images, // Note: These would need to be uploaded to the server first
      },
      {
        onSuccess: () => {
          Alert.alert(
            t('create.successTitle', 'Success'),
            t('create.successMessage', 'Listing created successfully'),
            [{ text: 'OK', onPress: () => router.back() }]
          );
        },
        onError: () => {
          Alert.alert(
            t('create.errorTitle', 'Error'),
            t('create.errorMessage', 'Failed to create listing')
          );
        },
      }
    );
  };

  const roomTypes = Object.values(ROOM_TYPES);
  const buildingTypes = Object.values(BUILDING_TYPES);
  const rentForOptions = Object.values(RENT_FOR);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ArrowLeft size={24} color={COLORS.gray[700]} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">
            {t('create.title', 'Create Listing')}
          </Text>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          {/* Images */}
          <View className="mb-6">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              {t('create.photos', 'Photos')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                onPress={handlePickImages}
                className="w-24 h-24 rounded-xl bg-gray-100 items-center justify-center mr-3 border-2 border-dashed border-gray-300"
              >
                <ImageIcon size={24} color={COLORS.gray[400]} />
                <Text className="text-xs text-gray-500 mt-1">Add</Text>
              </TouchableOpacity>
              {images.map((uri, index) => (
                <View key={index} className="relative mr-3">
                  <View
                    className="w-24 h-24 rounded-xl bg-gray-200"
                    style={{ backgroundColor: '#f0f0f0' }}
                  />
                  <TouchableOpacity
                    onPress={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                  >
                    <X size={14} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Basic Info */}
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

          {/* Room Type */}
          <View className="mb-4">
            <Text className="text-gray-700 mb-2 font-medium">
              {t('create.roomType', 'Room Type')}
            </Text>
            <Controller
              control={control}
              name="room_type"
              render={({ field: { onChange, value } }) => (
                <View className="flex-row flex-wrap gap-2">
                  {roomTypes.map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => onChange(value === type ? '' : type)}
                    >
                      <Badge variant={value === type ? 'primary' : 'default'}>
                        {type}
                      </Badge>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
          </View>

          {/* Building Type */}
          <View className="mb-4">
            <Text className="text-gray-700 mb-2 font-medium">
              {t('create.buildingType', 'Building Type')}
            </Text>
            <Controller
              control={control}
              name="building_type"
              render={({ field: { onChange, value } }) => (
                <View className="flex-row flex-wrap gap-2">
                  {buildingTypes.map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => onChange(value === type ? '' : type)}
                    >
                      <Badge variant={value === type ? 'primary' : 'default'}>
                        {type.replace('_', ' ')}
                      </Badge>
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

          {/* Description */}
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

          {/* Submit */}
          <Button
            onPress={handleSubmit(onSubmit)}
            loading={isPending}
            fullWidth
            className="mt-4 mb-8"
          >
            {t('create.submit', 'Create Listing')}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
