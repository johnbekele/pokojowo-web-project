import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { palette } from '@/lib/theme';
import { PokojowoMark } from '@/components/shared/brand';

/**
 * Full-screen branded splash shown while the app initializes. Uses a brand
 * gradient with a fade/scale-in logo so the cold-start feels intentional rather
 * than a blank screen. Purely presentational — no assets required.
 */
export default function AnimatedSplash() {
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) });
    logoScale.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.back(1.4)) });
    textOpacity.value = withDelay(250, withTiming(1, { duration: 500 }));
  }, [logoOpacity, logoScale, textOpacity]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: (1 - textOpacity.value) * 12 }],
  }));

  return (
    <LinearGradient
      colors={[palette.primary[400], palette.primary[600], palette.primary[800]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <PokojowoMark size={96} color="#ffffff" accent="rgba(255,255,255,0.4)" />
      </Animated.View>

      <Animated.View style={textStyle}>
        <Text style={styles.wordmark}>Pokojowo</Text>
        <Text style={styles.tagline}>Find your perfect flatmate</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    marginBottom: 24,
  },
  wordmark: {
    color: '#ffffff',
    fontSize: 40,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  tagline: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 6,
  },
});
