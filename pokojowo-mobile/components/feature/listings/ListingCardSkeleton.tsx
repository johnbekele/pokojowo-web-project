import { View } from 'react-native';
import { Skeleton } from '@/components/ui';

export default function ListingCardSkeleton() {
  return (
    <View className="bg-card border border-border rounded-2xl mx-4 mb-4 overflow-hidden">
      <Skeleton width="100%" height={192} radius={0} />
      <View className="p-4 gap-2">
        <Skeleton width="70%" height={18} />
        <Skeleton width="90%" height={14} />
        <Skeleton width="50%" height={14} />
      </View>
    </View>
  );
}
