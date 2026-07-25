/**
 * Design system source of truth.
 *
 * - `palette` holds the raw brand/neutral scales (shared across schemes).
 * - `lightColors` / `darkColors` expose the semantic tokens as hex strings for
 *   the rare surfaces that cannot use NativeWind classNames (maps, gradients,
 *   SVG, status bar). For everything else prefer the semantic Tailwind classes
 *   (`bg-bg`, `bg-card`, `text-text`, `text-muted`, `border-border`, `bg-brand`),
 *   which resolve per light/dark automatically.
 *
 * The className tokens are wired to CSS variables in `global.css`; keep the
 * values here in sync with those variables.
 */

export const palette = {
  primary: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
    950: '#042f2e',
  },
  secondary: {
    50: '#fdf4ff',
    100: '#fae8ff',
    200: '#f5d0fe',
    300: '#f0abfc',
    400: '#e879f9',
    500: '#d946ef',
    600: '#c026d3',
    700: '#a21caf',
    800: '#86198f',
    900: '#701a75',
    950: '#4a044e',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
  status: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
} as const;

export interface ThemeColors {
  bg: string;
  surface: string;
  card: string;
  border: string;
  text: string;
  muted: string;
  brand: string;
  brandFg: string;
  danger: string;
  success: string;
  warning: string;
  info: string;
}

export const lightColors: ThemeColors = {
  bg: '#ffffff',
  surface: '#f9fafb',
  card: '#ffffff',
  border: '#e5e7eb',
  text: '#111827',
  muted: '#6b7280',
  brand: '#0d9488',
  brandFg: '#ffffff',
  danger: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
  info: '#3b82f6',
};

export const darkColors: ThemeColors = {
  bg: '#030712',
  surface: '#111827',
  card: '#1f2937',
  border: '#374151',
  text: '#f3f4f6',
  muted: '#9ca3af',
  brand: '#2dd4bf',
  brandFg: '#030712',
  danger: '#f87171',
  success: '#4ade80',
  warning: '#fbbf24',
  info: '#60a5fa',
};

export const themes = {
  light: lightColors,
  dark: darkColors,
} as const;

export type ColorScheme = keyof typeof themes;

/** Typography scale (font sizes + line heights, in px). */
export const typography = {
  fontFamily: {
    sans: 'Inter',
  },
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  lineHeight: {
    xs: 16,
    sm: 20,
    base: 24,
    lg: 28,
    xl: 28,
    '2xl': 32,
    '3xl': 36,
    '4xl': 44,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

/** Spacing scale (px) — mirrors Tailwind's default multiples of 4. */
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

/** Border radius scale (px). */
export const radius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  '2xl': 28,
  full: 9999,
} as const;
