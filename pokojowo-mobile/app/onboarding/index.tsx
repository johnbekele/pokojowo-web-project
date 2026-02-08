import { View, Text, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState, useRef } from 'react';
import { FlatList } from 'react-native';
import { Users, Home, MessageCircle } from 'lucide-react-native';

import { Button } from '@/components/ui';
import { COLORS } from '@/lib/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  titleKey: string;
  descriptionKey: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    icon: Users,
    titleKey: 'welcome.slide1.title',
    descriptionKey: 'welcome.slide1.description',
  },
  {
    id: '2',
    icon: Home,
    titleKey: 'welcome.slide2.title',
    descriptionKey: 'welcome.slide2.description',
  },
  {
    id: '3',
    icon: MessageCircle,
    titleKey: 'welcome.slide3.title',
    descriptionKey: 'welcome.slide3.description',
  },
];

export default function OnboardingWelcomeScreen() {
  const { t } = useTranslation('common');
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      router.push('/onboarding/role');
    }
  };

  const handleSkip = () => {
    router.push('/onboarding/role');
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => {
    const IconComponent = item.icon;
    return (
      <View style={{ width: SCREEN_WIDTH }} className="flex-1 items-center justify-center px-8">
        <View className="w-32 h-32 rounded-full bg-primary-100 items-center justify-center mb-8">
          <IconComponent size={64} color={COLORS.primary[600]} />
        </View>
        <Text className="text-3xl font-bold text-gray-900 text-center mb-4">
          {t(item.titleKey, getDefaultTitle(item.id))}
        </Text>
        <Text className="text-lg text-gray-500 text-center">
          {t(item.descriptionKey, getDefaultDescription(item.id))}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Skip button */}
      <View className="absolute top-16 right-4 z-10">
        <Button variant="ghost" onPress={handleSkip}>
          {t('actions.skip', 'Skip')}
        </Button>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(index);
        }}
        className="flex-1"
      />

      {/* Pagination dots */}
      <View className="flex-row justify-center gap-2 mb-6">
        {slides.map((_, index) => (
          <View
            key={index}
            className={`w-2 h-2 rounded-full ${
              index === currentIndex ? 'bg-primary-600 w-6' : 'bg-gray-300'
            }`}
          />
        ))}
      </View>

      {/* Next button */}
      <View className="px-6 pb-4">
        <Button onPress={handleNext} fullWidth>
          {currentIndex === slides.length - 1
            ? t('actions.continue', 'Get Started')
            : t('actions.next', 'Next')}
        </Button>
      </View>
    </SafeAreaView>
  );
}

function getDefaultTitle(id: string): string {
  switch (id) {
    case '1':
      return 'Find Your Perfect Flatmate';
    case '2':
      return 'Discover Great Rooms';
    case '3':
      return 'Connect & Chat';
    default:
      return '';
  }
}

function getDefaultDescription(id: string): string {
  switch (id) {
    case '1':
      return 'Our smart matching finds compatible roommates based on your lifestyle and preferences';
    case '2':
      return 'Browse verified listings and find the perfect place to call home';
    case '3':
      return 'Chat with matches and landlords to find your ideal living situation';
    default:
      return '';
  }
}
