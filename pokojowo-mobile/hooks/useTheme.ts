import { useColorScheme } from 'nativewind';
import useUIStore, { type ThemeMode } from '@/stores/uiStore';
import { darkColors, lightColors, type ColorScheme, type ThemeColors } from '@/lib/theme';

export interface UseThemeResult {
  /** The user's preference: 'light' | 'dark' | 'system'. */
  theme: ThemeMode;
  /** The effective scheme after resolving 'system'. */
  scheme: ColorScheme;
  /** Raw hex tokens for surfaces that cannot use classNames (maps, SVG, status bar). */
  colors: ThemeColors;
  isDark: boolean;
  setTheme: (theme: ThemeMode) => void;
}

/**
 * Read the active color scheme + raw token values. Prefer NativeWind semantic
 * classNames (bg-bg, text-text, ...) for styling; use `colors` only where a
 * className cannot be applied.
 */
export function useTheme(): UseThemeResult {
  const { colorScheme } = useColorScheme();
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  const scheme: ColorScheme = colorScheme === 'dark' ? 'dark' : 'light';
  const isDark = scheme === 'dark';

  return {
    theme,
    scheme,
    isDark,
    colors: isDark ? darkColors : lightColors,
    setTheme,
  };
}

export default useTheme;
