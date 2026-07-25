import { useState, useRef } from 'react';
import { View, Text, Dimensions, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Users, Home, MessageCircle, type LucideIcon } from 'lucide-react-native';

import { Button } from '@/components/ui';
import useUIStore from '@/stores/uiStore';
import useTheme from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  icon: LucideIcon;
  titleKey: string;
  descriptionKey: string;
}

const slides: OnboardingSlide[] = [
  { id: '1', icon: Users, titleKey: 'welcome.slide1.title', descriptionKey: 'welcome.slide1.description' },
  { id: '2', icon: Home, titleKey: 'welcome.slide2.title', descriptionKey: 'welcome.slide2.description' },
  { id: '3', icon: MessageCircle, titleKey: 'welcome.slide3.title', descriptionKey: 'welcome.slide3.description' },
];

export default function OnboardingWelcomeScreen() {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const setSeenWelcome = useUIStore((s) => s.setSeenWelcome);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

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

  const renderSlide = ({ item }: { item: OnboardingSlide }) => {
    const Icon = item.icon;
    return (
      <View style={{ width: SCREEN_WIDTH }} className="flex-1 items-center justify-center px-8">
        <View className="w-32 h-32 rounded-full bg-primary-100 dark:bg-primary-900 items-center justify-center mb-8">
          <Icon size={64} color={colors.brand} />
        </View>
        <Text className="text-3xl font-bold text-text text-center mb-4">{t(item.titleKey)}</Text>
        <Text className="text-lg text-muted text-center">{t(item.descriptionKey)}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="absolute top-4 right-4 z-10">
        <Button variant="ghost" onPress={() => finish('/(auth)/login')}>
          {t('actions.skip')}
        </Button>
      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH));
        }}
        className="flex-1"
      />

      <View className="flex-row justify-center gap-2 mb-6">
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
          {currentIndex === slides.length - 1
            ? t('actions.continue')
            : t('actions.next')}
        </Button>
        {currentIndex === slides.length - 1 && (
          <Button variant="ghost" fullWidth onPress={() => finish('/(auth)/login')}>
            {t('nav.login')}
          </Button>
        )}
      </View>
    </SafeAreaView>
  );
}
