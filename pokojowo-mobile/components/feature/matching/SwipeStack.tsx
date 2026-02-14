import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Heart, X, RotateCcw, Undo2 } from 'lucide-react-native';

import SwipeCard from './SwipeCard';
import { Button } from '@/components/ui';
import { useUnlikeUser } from '@/hooks/likes/useLikes';
import type { MatchResult } from '@/types/matching.types';
import { COLORS } from '@/lib/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

type SwipeDirection = 'left' | 'right' | null;

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
  const { t } = useTranslation('matching');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastSwipe, setLastSwipe] = useState<{
    direction: SwipeDirection;
    match: MatchResult | null;
  }>({ direction: null, match: null });

  const position = useRef(new Animated.ValueXY()).current;
  const { mutate: unlikeUser } = useUnlikeUser();

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
      // Only capture gesture if horizontal movement is significant
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        // Only capture if horizontal movement > 10px (allows taps through)
        return Math.abs(gesture.dx) > 10;
      },
      onPanResponderGrant: () => {
        // Reset position when gesture starts
      },
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

  const swipeLeft = useCallback(() => {
    const match = matches[currentIndex];
    Animated.timing(position, {
      toValue: { x: -SCREEN_WIDTH * 1.5, y: 0 },
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      if (match) {
        onSwipeLeft(match);
        setLastSwipe({ direction: 'left', match });
      }
      setCurrentIndex((prev) => prev + 1);
      position.setValue({ x: 0, y: 0 });
    });
  }, [currentIndex, matches, onSwipeLeft, position]);

  const swipeRight = useCallback(() => {
    const match = matches[currentIndex];
    Animated.timing(position, {
      toValue: { x: SCREEN_WIDTH * 1.5, y: 0 },
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      if (match) {
        onSwipeRight(match);
        setLastSwipe({ direction: 'right', match });
      }
      setCurrentIndex((prev) => prev + 1);
      position.setValue({ x: 0, y: 0 });
    });
  }, [currentIndex, matches, onSwipeRight, position]);

  const resetPosition = useCallback(() => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 5,
      useNativeDriver: false,
    }).start();
  }, [position]);

  const handleUndo = useCallback(() => {
    if (currentIndex <= 0 || !lastSwipe.match) return;

    // If last swipe was a like (right), unlike the user
    if (lastSwipe.direction === 'right' && lastSwipe.match) {
      unlikeUser(lastSwipe.match.user_id);
    }

    // Go back to previous card
    setCurrentIndex((prev) => prev - 1);
    setLastSwipe({ direction: null, match: null });
  }, [currentIndex, lastSwipe, unlikeUser]);

  const canUndo = currentIndex > 0 && lastSwipe.match !== null;
  const visibleMatches = matches.slice(currentIndex, currentIndex + 2);

  if (visibleMatches.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-xl font-semibold text-gray-900 mb-2">
          {t('swipe.noMoreMatches', 'No more matches')}
        </Text>
        <Text className="text-gray-500 text-center mb-6">
          {t('swipe.checkBackLater', 'Check back later for new potential flatmates')}
        </Text>
        <View className="flex-row gap-4">
          {canUndo && (
            <Button
              variant="outline"
              onPress={handleUndo}
              icon={<Undo2 size={18} color={COLORS.gray[600]} />}
            >
              {t('swipe.undo', 'Undo')}
            </Button>
          )}
          {onRefresh && (
            <Button onPress={onRefresh} icon={<RotateCcw size={18} color="white" />}>
              {t('swipe.refresh', 'Refresh')}
            </Button>
          )}
        </View>
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
                key={match.user_id || `match-${index}`}
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
                    {t('swipe.like', 'LIKE')}
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
                    {t('swipe.nope', 'NOPE')}
                  </Text>
                </Animated.View>
              </Animated.View>
            );
          }

          return (
            <Animated.View
              key={match.user_id || `match-bg-${index}`}
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
      <View className="flex-row items-center justify-center gap-4 mt-8">
        {/* Undo button - only shows when can undo */}
        {canUndo && (
          <TouchableOpacity
            onPress={handleUndo}
            className="w-12 h-12 rounded-full border-2 border-amber-400 items-center justify-center bg-white"
          >
            <Undo2 size={20} color={COLORS.warning} />
          </TouchableOpacity>
        )}

        {/* Pass button */}
        <TouchableOpacity
          onPress={swipeLeft}
          className="w-16 h-16 rounded-full border-2 border-gray-300 items-center justify-center bg-white"
        >
          <X size={28} color={COLORS.error} />
        </TouchableOpacity>

        {/* Like button */}
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
