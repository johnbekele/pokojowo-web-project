import { useState, useRef } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Users, Home, MessageCircle, type LucideIcon } from 'lucide-react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { Button } from '@/components/ui';
import useUIStore from '@/stores/uiStore';
import { palette } from '@/lib/theme';
import { cn } from '@/lib/utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  icon: LucideIcon;
  titleKey: string;
  descriptionKey: string;
  gradient: [string, string];
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    icon: Users,
    titleKey: 'welcome.slide1.title',
    descriptionKey: 'welcome.slide1.description',
    gradient: [palette.primary[400], palette.primary[600]],
  },
  {
    id: '2',
    icon: Home,
    titleKey: 'welcome.slide2.title',
    descriptionKey: 'welcome.slide2.description',
    gradient: [palette.secondary[400], palette.secondary[600]],
  },
  {
    id: '3',
    icon: MessageCircle,
    titleKey: 'welcome.slide3.title',
    descriptionKey: 'welcome.slide3.description',
    gradient: [palette.primary[500], palette.secondary[500]],
  },
];

const AnimatedFlatList = Animated.FlatList<OnboardingSlide>;

function Slide({ item, index, scrollX }: { item: OnboardingSlide; index: number; scrollX: SharedValue<number> }) {
  const { t } = useTranslation('common');
  const Icon = item.icon;

  const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];

  const medallionStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(scrollX.value, inputRange, [0.6, 1, 0.6], Extrapolation.CLAMP) },
    ],
    opacity: interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], Extrapolation.CLAMP),
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollX.value, inputRange, [24, 0, 24], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <View style={{ width: SCREEN_WIDTH }} className="flex-1 items-center justify-center px-8">
      <Animated.View style={medallionStyle} className="mb-10">
        <LinearGradient
          colors={item.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 176,
            height: 176,
            borderRadius: 88,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={80} color="#ffffff" strokeWidth={1.6} />
        </LinearGradient>
      </Animated.View>

      <Animated.View style={textStyle} className="items-center">
        <Text className="text-3xl font-extrabold text-text text-center mb-3">{t(item.titleKey)}</Text>
        <Text className="text-lg text-muted text-center leading-7">{t(item.descriptionKey)}</Text>
      </Animated.View>
    </View>
  );
}

export default function OnboardingWelcomeScreen() {
  const { t } = useTranslation('common');
  const setSeenWelcome = useUIStore((s) => s.setSeenWelcome);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<Animated.FlatList<OnboardingSlide>>(null);
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  const finish = (target: '/(auth)/signup' | '/(auth)/login') => {
    setSeenWelcome();
    router.replace(target);
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      finish('/(auth)/signup');
    }
  };

  const isLast = currentIndex === slides.length - 1;

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="absolute top-4 right-4 z-10">
        <Button variant="ghost" onPress={() => finish('/(auth)/login')}>
          {t('actions.skip')}
        </Button>
      </View>

      <AnimatedFlatList
        ref={flatListRef}
        data={slides}
        renderItem={({ item, index }) => <Slide item={item} index={index} scrollX={scrollX} />}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH));
        }}
        className="flex-1"
      />

      <View className="flex-row justify-center gap-2 mb-8">
        {slides.map((_, index) => (
          <View
            key={index}
            className={cn(
              'h-2 rounded-full',
              index === currentIndex ? 'bg-brand w-6' : 'bg-border w-2'
            )}
          />
        ))}
      </View>

      <View className="px-6 pb-4 gap-3">
        <Button onPress={handleNext} fullWidth>
          {isLast ? t('welcome.getStarted', 'Get started') : t('actions.next')}
        </Button>
        <Button variant="ghost" fullWidth onPress={() => finish('/(auth)/login')}>
          {t('welcome.haveAccount', 'I already have an account')}
        </Button>
      </View>
    </SafeAreaView>
  );
}
