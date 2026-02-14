import { useRef } from 'react';
import { TouchableOpacity, Animated } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import {
  useMyInteractions,
  useLikeListing,
  useUnlikeListing,
} from '@/hooks/listingInteractions/useListingInteractions';
import useAuthStore from '@/stores/authStore';
import { COLORS } from '@/lib/constants';

interface ListingLikeButtonProps {
  listingId: string;
  size?: number;
  className?: string;
}

export default function ListingLikeButton({
  listingId,
  size = 24,
  className,
}: ListingLikeButtonProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { data: interactions } = useMyInteractions(listingId);
  const { mutate: likeListing, isPending: isLiking } = useLikeListing();
  const { mutate: unlikeListing, isPending: isUnliking } = useUnlikeListing();

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pendingRef = useRef(false);

  const isLiked = interactions?.has_liked ?? false;
  const isPending = isLiking || isUnliking;

  const handlePress = () => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }

    if (pendingRef.current || isPending) return;
    pendingRef.current = true;

    // Animate on like
    if (!isLiked) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }

    if (isLiked) {
      unlikeListing(listingId, {
        onSettled: () => {
          pendingRef.current = false;
        },
      });
    } else {
      likeListing(listingId, {
        onSettled: () => {
          pendingRef.current = false;
        },
      });
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isPending}
      className={className}
      activeOpacity={0.7}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Heart
          size={size}
          color={isLiked ? COLORS.error : COLORS.gray[500]}
          fill={isLiked ? COLORS.error : 'none'}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}
