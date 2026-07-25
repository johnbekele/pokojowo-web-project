import { useEffect, useRef } from 'react';
import { Animated, View, type DimensionValue } from 'react-native';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  circle?: boolean;
  className?: string;
}

/** Pulsing placeholder block used for loading states. */
export function Skeleton({ width, height = 16, radius = 8, circle, className }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  const resolvedRadius = circle ? 9999 : radius;

  return (
    <Animated.View
      className={cn('bg-surface', className)}
      style={{
        opacity,
        width,
        height: circle && typeof width === 'number' ? width : height,
        borderRadius: resolvedRadius,
      }}
    />
  );
}

/** Convenience: a common "avatar + two lines" card row skeleton. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <View className={cn('flex-row items-center gap-3 p-4', className)}>
      <Skeleton width={48} circle />
      <View className="flex-1 gap-2">
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={12} />
      </View>
    </View>
  );
}

export default Skeleton;
