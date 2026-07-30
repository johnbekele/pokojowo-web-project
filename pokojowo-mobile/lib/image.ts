import { IMAGE_BASE_URL } from './constants';

const FALLBACK_LISTING_IMAGE =
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800';

/**
 * Resolves an image URL to an absolute URL. Handles:
 * - absolute http(s) URLs (returned as-is)
 * - relative server paths (prefixed with IMAGE_BASE_URL)
 * - object shapes like { url } used by some API responses
 */
export function getImageUrl(
  input?: string | { url?: string } | null,
  fallback: string = FALLBACK_LISTING_IMAGE
): string {
  const url = typeof input === 'string' ? input : input?.url;
  if (!url) return fallback;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${IMAGE_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

const FALLBACK_AVATARS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop&crop=faces',
];

/**
 * Resolves a user's avatar. Same rules as {@link getImageUrl}, except the
 * no-photo fallback is picked from `seed` so a deck of photo-less users doesn't
 * render as the same face repeated.
 */
export function getAvatarUrl(
  input?: string | { url?: string } | null,
  seed?: string | null
): string {
  const url = typeof input === 'string' ? input : input?.url;
  if (url) return getImageUrl(url);

  let index = 0;
  for (let i = 0; i < (seed?.length ?? 0); i += 1) {
    index = (index * 31 + seed!.charCodeAt(i)) % FALLBACK_AVATARS.length;
  }
  return FALLBACK_AVATARS[index];
}

export { FALLBACK_LISTING_IMAGE, FALLBACK_AVATARS };
