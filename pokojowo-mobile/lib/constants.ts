import Constants from 'expo-constants';
import { palette } from './theme';

// API URLs
export const API_BASE_URL =
  Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000/api';
export const SOCKET_URL =
  Constants.expoConfig?.extra?.socketUrl || 'http://localhost:3000';

// App colors — derived from the design-system palette in lib/theme.ts (single
// source of truth). Kept here for backwards-compatible imports.
export const COLORS = {
  primary: palette.primary,
  secondary: palette.secondary,
  gray: palette.gray,
  success: palette.status.success,
  warning: palette.status.warning,
  error: palette.status.error,
  info: palette.status.info,
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
