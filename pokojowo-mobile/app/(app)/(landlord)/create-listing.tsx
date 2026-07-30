import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ShieldAlert } from 'lucide-react-native';

import { ListingForm } from '@/components/feature/listings';
import { useCreateListing } from '@/hooks/listings/useListings';
import useAuthStore from '@/stores/authStore';
import useUIStore from '@/stores/uiStore';
import useTheme from '@/hooks/useTheme';
import type { CreateListingData } from '@/types/listing.types';

export default function CreateListingScreen() {
  const { t } = useTranslation('landlord');
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);

  const { mutate: createListing, isPending } = useCreateListing();

  const handleSubmit = (data: CreateListingData) => {
    createListing(data, {
      onSuccess: () => {
        showToast({ type: 'success', message: t('create.successMessage', 'Listing created successfully') });
        router.back();
      },
      onError: () => {
        showToast({ type: 'error', message: t('create.errorMessage', 'Failed to create listing') });
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-text">{t('create.title', 'Create Listing')}</Text>
      </View>

      {user?.isVerified === false && (
        <TouchableOpacity
          onPress={() => router.push('/(app)/(profile)/verify-phone')}
          className="flex-row items-center gap-2 bg-warning/10 border-b border-warning/30 px-4 py-3"
        >
          <ShieldAlert size={18} color={colors.warning} />
          <Text className="flex-1 text-sm text-text">
            {t('create.verifyRequired', 'Verify your email to publish listings.')}
          </Text>
        </TouchableOpacity>
      )}

      {/* ListingForm brings its own keyboard-aware scroll container. */}
      <ListingForm
        submitLabel={t('create.submit', 'Create Listing')}
        submitting={isPending}
        onSubmit={handleSubmit}
      />
    </SafeAreaView>
  );
}
