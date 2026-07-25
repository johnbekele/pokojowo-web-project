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

export { FALLBACK_LISTING_IMAGE };
