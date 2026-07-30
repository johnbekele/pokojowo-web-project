import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Camera } from 'lucide-react-native';

import { Button, Input, Avatar } from '@/components/ui';
import KeyboardAwareScrollView from '@/components/shared/KeyboardAwareScrollView';
import { PreferredAreaPicker } from '@/components/feature/profile';
import { useUpdateProfile, useUploadProfilePhoto } from '@/hooks/user/useUser';
import { usePreferredArea, useUpdatePreferredArea } from '@/hooks/user/usePreferredArea';
import useAuthStore from '@/stores/authStore';
import useUIStore from '@/stores/uiStore';
import useTheme from '@/hooks/useTheme';
import { getImageUrl } from '@/lib/image';

// Latest valid birth date: exactly 18 years ago today
const maxDateOfBirth = (): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
};

const profileSchema = z.object({
  firstname: z.string().min(1, 'First name is required'),
  lastname: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  dateOfBirth: z
    .string()
    .optional()
    .refine(
      (v) => !v || (/^\d{4}-\d{2}-\d{2}$/.test(v) && v <= maxDateOfBirth()),
      'You must be at least 18 years old (format: YYYY-MM-DD)'
    ),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function EditProfileScreen() {
  const { t } = useTranslation('profile');
  const router = useRouter();
  const { colors } = useTheme();
  const { user, updateUser } = useAuthStore();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const { mutate: uploadPhoto, isPending: isUploading } = useUploadProfilePhoto();
  const showToast = useUIStore((s) => s.showToast);

  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Preferred area lives on the tenant profile and saves through its own
  // endpoint, so it isn't part of the react-hook-form schema above.
  const isTenant = !user?.role?.includes('Landlord');
  const { data: savedArea } = usePreferredArea();
  const { mutateAsync: savePreferredArea } = useUpdatePreferredArea();
  const [area, setArea] = useState({ city: '', districts: [] as string[] });

  useEffect(() => {
    if (savedArea) {
      setArea({ city: savedArea.location || '', districts: savedArea.districts });
    }
  }, [savedArea]);

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
      dateOfBirth: user?.dateOfBirth ? String(user.dateOfBirth).slice(0, 10) : '',
      bio: user?.bio || '',
    },
  });

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast({
        type: 'warning',
        message: t('edit.permissionMessage', 'Please grant camera roll permissions'),
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const localUri = result.assets[0].uri;
    // Optimistic preview while the upload runs.
    setPhotoUri(localUri);

    uploadPhoto(localUri, {
      onSuccess: (url) => {
        updateUser({ photo: { url } });
        showToast({
          type: 'success',
          message: t('edit.photoUpdated', 'Photo updated'),
        });
      },
      onError: () => {
        setPhotoUri(null);
        showToast({
          type: 'error',
          message: t('edit.photoError', 'Failed to upload photo'),
        });
      },
    });
  };

  const areaChanged =
    !!savedArea &&
    (area.city !== (savedArea.location || '') ||
      area.districts.join('|') !== savedArea.districts.join('|'));

  const onSubmit = async (data: ProfileForm) => {
    if (isTenant && areaChanged) {
      try {
        await savePreferredArea({
          location: area.city || null,
          districts: area.districts,
        });
      } catch {
        showToast({
          type: 'error',
          message: t('edit.areaError', 'Could not save your preferred area'),
        });
        return;
      }
    }

    updateProfile(
      {
        firstname: data.firstname,
        lastname: data.lastname,
        phone: data.phone,
        location: data.location,
        dateOfBirth: data.dateOfBirth || undefined,
        bio: data.bio,
      },
      {
        onSuccess: () => {
          updateUser({
            firstname: data.firstname,
            lastname: data.lastname,
            phone: data.phone,
            location: data.location,
            dateOfBirth: data.dateOfBirth || undefined,
            bio: data.bio,
          });
          showToast({
            type: 'success',
            message: t('edit.successMessage', 'Profile updated successfully'),
          });
          router.back();
        },
        onError: () => {
          showToast({
            type: 'error',
            message: t('edit.errorMessage', 'Failed to update profile'),
          });
        },
      }
    );
  };

  const currentPhotoUrl =
    photoUri || (user?.photo ? getImageUrl(user.photo) : null);
  const displayName =
    [user?.firstname, user?.lastname].filter(Boolean).join(' ') ||
    user?.username ||
    'User';

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-text flex-1">
          {t('edit.title', 'Edit Profile')}
        </Text>
      </View>

      <KeyboardAwareScrollView>
        {/* Photo */}
        <View className="items-center mb-8">
          <TouchableOpacity
            onPress={handlePickImage}
            disabled={isUploading}
            className="relative"
          >
            <Avatar source={currentPhotoUrl} name={displayName} size="xl" />
            <View className="absolute bottom-0 right-0 bg-brand rounded-full p-2">
              {isUploading ? (
                <ActivityIndicator size="small" color={colors.brandFg} />
              ) : (
                <Camera size={18} color={colors.brandFg} />
              )}
            </View>
          </TouchableOpacity>
          <Text className="text-muted mt-2">
            {isUploading
              ? t('edit.uploading', 'Uploading…')
              : t('edit.changePhoto', 'Tap to change photo')}
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
          name="dateOfBirth"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t('edit.dateOfBirth', 'Date of birth')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.dateOfBirth?.message}
              keyboardType="numbers-and-punctuation"
              placeholder="YYYY-MM-DD"
              maxLength={10}
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

        {isTenant && (
          <View className="mt-2 mb-4">
            <PreferredAreaPicker
              city={area.city}
              districts={area.districts}
              onChange={setArea}
            />
          </View>
        )}

        {/* Save button */}
        <Button
          onPress={handleSubmit(onSubmit)}
          loading={isPending}
          fullWidth
          className="mt-4"
        >
          {t('edit.save', 'Save Changes')}
        </Button>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
