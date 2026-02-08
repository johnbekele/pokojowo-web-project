import { useState, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Heart, X, RotateCcw } from 'lucide-react-native';

import SwipeCard from './SwipeCard';
import { Button } from '@/components/ui';
import type { MatchResult } from '@/types/matching.types';
import { COLORS } from '@/lib/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface SwipeStackProps {
  matches: MatchResult[];
  onSwipeLeft: (match: MatchResult) => void;
  onSwipeRight: (match: MatchResult) => void;
  onCardPress?: (match: MatchResult) => void;
  onRefresh?: () => void;
}

export default function SwipeStack({
  matches,
  onSwipeLeft,
  onSwipeRight,
  onCardPress,
  onRefresh,
}: SwipeStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH / 4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const nextCardScale = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [1, 0.9, 1],
    extrapolate: 'clamp',
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          swipeRight();
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          swipeLeft();
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const swipeLeft = () => {
    Animated.timing(position, {
      toValue: { x: -SCREEN_WIDTH * 1.5, y: 0 },
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      const match = matches[currentIndex];
      if (match) {
        onSwipeLeft(match);
      }
      setCurrentIndex((prev) => prev + 1);
      position.setValue({ x: 0, y: 0 });
    });
  };

  const swipeRight = () => {
    Animated.timing(position, {
      toValue: { x: SCREEN_WIDTH * 1.5, y: 0 },
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      const match = matches[currentIndex];
      if (match) {
        onSwipeRight(match);
      }
      setCurrentIndex((prev) => prev + 1);
      position.setValue({ x: 0, y: 0 });
    });
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 5,
      useNativeDriver: false,
    }).start();
  };

  const visibleMatches = matches.slice(currentIndex, currentIndex + 2);

  if (visibleMatches.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-xl font-semibold text-gray-900 mb-2">
          No more matches
        </Text>
        <Text className="text-gray-500 text-center mb-6">
          Check back later for new potential flatmates
        </Text>
        {onRefresh && (
          <Button onPress={onRefresh} icon={<RotateCcw size={18} color="white" />}>
            Refresh
          </Button>
        )}
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center">
      {/* Cards stack */}
      <View style={{ width: SCREEN_WIDTH - 32, height: 500 }}>
        {visibleMatches.reverse().map((match, index) => {
          const isFirst = index === visibleMatches.length - 1;

          if (isFirst) {
            return (
              <Animated.View
                key={match.user_id}
                {...panResponder.panHandlers}
                style={[
                  {
                    position: 'absolute',
                    transform: [
                      { translateX: position.x },
                      { translateY: position.y },
                      { rotate },
                    ],
                  },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.95}
                  onPress={() => onCardPress?.(match)}
                >
                  <SwipeCard match={match} />
                </TouchableOpacity>

                {/* Like label */}
                <Animated.View
                  style={[
                    { opacity: likeOpacity },
                    {
                      position: 'absolute',
                      top: 32,
                      left: 16,
                      borderWidth: 4,
                      borderColor: '#22c55e',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      transform: [{ rotate: '-12deg' }],
                    },
                  ]}
                >
                  <Text style={{ color: '#22c55e', fontWeight: 'bold', fontSize: 24 }}>
                    LIKE
                  </Text>
                </Animated.View>

                {/* Nope label */}
                <Animated.View
                  style={[
                    { opacity: nopeOpacity },
                    {
                      position: 'absolute',
                      top: 32,
                      right: 16,
                      borderWidth: 4,
                      borderColor: '#ef4444',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      transform: [{ rotate: '12deg' }],
                    },
                  ]}
                >
                  <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 24 }}>
                    NOPE
                  </Text>
                </Animated.View>
              </Animated.View>
            );
          }

          return (
            <Animated.View
              key={match.user_id}
              style={[
                {
                  position: 'absolute',
                  transform: [{ scale: nextCardScale }],
                },
              ]}
            >
              <SwipeCard match={match} style={{ opacity: 0.9 }} />
            </Animated.View>
          );
        })}
      </View>

      {/* Action buttons */}
      <View className="flex-row items-center justify-center gap-6 mt-8">
        <TouchableOpacity
          onPress={swipeLeft}
          className="w-16 h-16 rounded-full border-2 border-gray-300 items-center justify-center bg-white"
        >
          <X size={28} color={COLORS.error} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={swipeRight}
          className="w-20 h-20 rounded-full bg-primary-600 items-center justify-center"
        >
          <Heart size={32} color="white" fill="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
