import Constants from 'expo-constants';

// API URLs
export const API_BASE_URL =
  Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000/api';
export const SOCKET_URL =
  Constants.expoConfig?.extra?.socketUrl || 'http://localhost:3000';

// App colors
export const COLORS = {
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
  },
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Image upload limits
export const UPLOAD = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  MAX_IMAGES_PER_LISTING: 10,
} as const;

// Animation durations
export const ANIMATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

// Matching
export const MATCHING = {
  MIN_COMPATIBILITY_SCORE: 0,
  MAX_COMPATIBILITY_SCORE: 100,
  DEFAULT_LIMIT: 20,
} as const;

// User roles
export const USER_ROLES = {
  USER: 'User',
  ADMIN: 'Admin',
  MODERATOR: 'Moderator',
  LANDLORD: 'Landlord',
  TENANT: 'Tenant',
  AGENT: 'Agent',
} as const;

// Room types
export const ROOM_TYPES = {
  SINGLE: 'Single',
  DOUBLE: 'Double',
  SUITE: 'Suite',
} as const;

// Building types
export const BUILDING_TYPES = {
  APARTMENT: 'Apartment',
  LOFT: 'Loft',
  BLOCK: 'Block',
  DETACHED_HOUSE: 'Detached_House',
} as const;

// Rent for options
export const RENT_FOR = {
  WOMEN: 'Women',
  MAN: 'Man',
  FAMILY: 'Family',
  COUPLE: 'Couple',
  LOCAL: 'Local',
  STUDENT: 'Student',
  OPEN: 'Open to All',
} as const;

// Personality types
export const PERSONALITY_TYPES = [
  'introvert',
  'extrovert',
  'night_owl',
  'early_bird',
  'neat',
  'messy',
  'quiet',
  'talkative',
] as const;

// Cleanliness levels
export const CLEANLINESS_LEVELS = [
  'very_clean',
  'clean',
  'moderate',
  'relaxed',
  'messy',
] as const;

// Social levels
export const SOCIAL_LEVELS = [
  'very_social',
  'social',
  'moderate',
  'quiet',
  'very_quiet',
] as const;

// Gender options
export const GENDERS = ['male', 'female', 'other'] as const;
