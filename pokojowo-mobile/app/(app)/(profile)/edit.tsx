import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Camera, User } from 'lucide-react-native';

import { Button, Input, Avatar } from '@/components/ui';
import { useUpdateProfile } from '@/hooks/user/useUser';
import useAuthStore from '@/stores/authStore';
import { COLORS } from '@/lib/constants';

const profileSchema = z.object({
  firstname: z.string().min(1, 'First name is required'),
  lastname: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  age: z.string().optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function EditProfileScreen() {
  const { t } = useTranslation('profile');
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const { mutate: updateProfile, isPending } = useUpdateProfile();

  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstname: user?.firstname || '',
      lastname: user?.lastname || '',
      phone: user?.phone || '',
      location: user?.location || '',
      age: user?.age?.toString() || '',
      bio: user?.bio || '',
    },
  });

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        t('edit.permissionTitle', 'Permission required'),
        t('edit.permissionMessage', 'Please grant camera roll permissions')
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      // TODO: Upload to server
    }
  };

  const onSubmit = (data: ProfileForm) => {
    updateProfile(
      {
        firstname: data.firstname,
        lastname: data.lastname,
        phone: data.phone,
        location: data.location,
        age: data.age ? parseInt(data.age, 10) : undefined,
        bio: data.bio,
      },
      {
        onSuccess: () => {
          updateUser({
            firstname: data.firstname,
            lastname: data.lastname,
            phone: data.phone,
            location: data.location,
            age: data.age ? parseInt(data.age, 10) : undefined,
            bio: data.bio,
          });
          Alert.alert(
            t('edit.successTitle', 'Success'),
            t('edit.successMessage', 'Profile updated successfully'),
            [{ text: 'OK', onPress: () => router.back() }]
          );
        },
        onError: () => {
          Alert.alert(
            t('edit.errorTitle', 'Error'),
            t('edit.errorMessage', 'Failed to update profile')
          );
        },
      }
    );
  };

  const currentPhotoUrl =
    photoUri ||
    (typeof user?.photo === 'string' ? user.photo : (user?.photo as { url?: string })?.url);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ArrowLeft size={24} color={COLORS.gray[700]} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 flex-1">
          {t('edit.title', 'Edit Profile')}
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Photo */}
        <View className="items-center mb-8">
          <TouchableOpacity onPress={handlePickImage} className="relative">
            {currentPhotoUrl ? (
              <Image
                source={{ uri: currentPhotoUrl }}
                className="w-28 h-28 rounded-full"
              />
            ) : (
              <View className="w-28 h-28 rounded-full bg-gray-200 items-center justify-center">
                <User size={48} color={COLORS.gray[400]} />
              </View>
            )}
            <View className="absolute bottom-0 right-0 bg-primary-600 rounded-full p-2">
              <Camera size={18} color="white" />
            </View>
          </TouchableOpacity>
          <Text className="text-gray-500 mt-2">
            {t('edit.changePhoto', 'Tap to change photo')}
          </Text>
        </View>

        {/* Form */}
        <Controller
          control={control}
          name="firstname"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t('edit.firstName', 'First Name')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.firstname?.message}
              autoCapitalize="words"
            />
          )}
        />

        <Controller
          control={control}
          name="lastname"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t('edit.lastName', 'Last Name')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.lastname?.message}
              autoCapitalize="words"
            />
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t('edit.phone', 'Phone')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.phone?.message}
              keyboardType="phone-pad"
            />
          )}
        />

        <Controller
          control={control}
          name="location"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t('edit.location', 'Location')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.location?.message}
              placeholder="e.g., Warsaw, Poland"
            />
          )}
        />

        <Controller
          control={control}
          name="age"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t('edit.age', 'Age')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.age?.message}
              keyboardType="number-pad"
            />
          )}
        />

        <Controller
          control={control}
          name="bio"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t('edit.bio', 'About Me')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.bio?.message}
              multiline
              numberOfLines={4}
              style={{ height: 100, textAlignVertical: 'top' }}
              placeholder="Tell others about yourself..."
            />
          )}
        />

        {/* Save button */}
        <Button
          onPress={handleSubmit(onSubmit)}
          loading={isPending}
          fullWidth
          className="mt-4"
        >
          {t('edit.save', 'Save Changes')}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
