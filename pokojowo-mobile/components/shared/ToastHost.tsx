import { useEffect } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useUIStore from '@/stores/uiStore';
import Toast from '@/components/ui/Toast';

function ToastItem({
  id,
  type,
  title,
  message,
  duration,
  onDismiss,
}: {
  id: number;
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  onDismiss: (id: number) => void;
}) {
  const translateY = new Animated.Value(-12);
  const opacity = new Animated.Value(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => onDismiss(id), duration ?? 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }} className="mb-2">
      <Toast type={type} title={title} message={message} onDismiss={() => onDismiss(id)} />
    </Animated.View>
  );
}

/** Renders queued toasts from uiStore. Mount once near the app root. */
export default function ToastHost() {
  const insets = useSafeAreaInsets();
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      className="absolute left-0 right-0 px-4 z-50"
      style={{ top: insets.top + 8 }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} onDismiss={removeToast} />
      ))}
    </View>
  );
}
