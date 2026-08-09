import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const SUPPORTED_LANGUAGES = ['en', 'pl'];
const DEFAULT_SITE_URL = 'https://pokojowo.com';

const siteUrl = (import.meta.env.VITE_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '');

const normalizeLanguage = (language) => {
  const shortLanguage = String(language || 'en').split('-')[0].toLowerCase();
  return SUPPORTED_LANGUAGES.includes(shortLanguage) ? shortLanguage : 'en';
};

const getLocalizedText = (value, language) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value[language] || value.en || value.pl || '';
  return String(value);
};

const getListingLocation = (listing, listingTitle = '', language = 'en') => {
  const address = typeof listing?.address === 'string'
    ? listing.address
    : [listing?.address?.street, listing?.address?.city].filter(Boolean).join(', ');
  const structuredLocation = [listing?.district, listing?.city].filter(Boolean).join(', ');
  if (structuredLocation) return structuredLocation;
  if (address && listingTitle && address.trim().toLowerCase() === listingTitle.trim().toLowerCase()) {
    return language === 'pl' ? 'Polska' : 'Poland';
  }
  return address || (language === 'pl' ? 'Polska' : 'Poland');
};

const formatListingPrice = (listing, language) => {
  const price = Number(listing?.price ?? listing?.rent);
  if (!Number.isFinite(price)) return language === 'pl' ? 'Cena do ustalenia' : 'Price on request';
  return new Intl.NumberFormat(language === 'pl' ? 'pl-PL' : 'en-GB', {
    style: 'currency',
    currency: 'PLN',
    maximumFractionDigits: 0,
  }).format(price);
};

const truncate = (value, maxLength = 160) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
};

const upsertMeta = (selector, attributes, content) => {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    element.dataset.seo = 'true';
    document.head.appendChild(element);
  }
  element.dataset.seo = 'true';
  element.setAttribute('content', content);
};

const upsertLink = (selector, attributes) => {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('link');
    element.dataset.seo = 'true';
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
};

const localizedUrl = (pathname, language) => {
  const url = new URL(pathname || '/', siteUrl);
  url.searchParams.set('lang', language);
  return url.toString();
};

const routeMetadata = (pathname, t, language, listing) => {
  if (pathname === '/') {
    return { title: t('home.title'), description: t('home.description'), indexable: true };
  }
  if (pathname === '/discover') {
    return { title: t('discover.title'), description: t('discover.description'), indexable: true };
  }
  if (/^\/listing\/[^/]+$/.test(pathname)) {
    const listingTitle = getLocalizedText(listing?.title, language) || getListingLocation(listing, '', language);
    const listingLocation = getListingLocation(listing, listingTitle, language);
    const title = listing
      ? t('listing.title', {
          title: listingTitle,
          location: listingLocation,
          price: formatListingPrice(listing, language),
        })
      : t('fallbackListingTitle');
    const description = listing
      ? t('listing.description', {
          title: listingTitle,
          location: listingLocation,
          price: formatListingPrice(listing, language),
        })
      : t('fallbackListingDescription');
    return { title, description, indexable: true };
  }
  if (pathname === '/login') {
    return { title: t('auth.loginTitle'), description: t('auth.description'), indexable: false };
  }
  if (pathname === '/signup') {
    return { title: t('auth.signupTitle'), description: t('auth.description'), indexable: false };
  }
  return { title: t('generic.title'), description: t('generic.description'), indexable: false };
};

/**
 * Keeps document metadata in sync with the route without adding a runtime
 * dependency on a head-management library. Public pages get canonical and
 * language alternate URLs; authenticated and utility routes are noindexed.
 */
export default function SeoHead({ listing } = {}) {
  const location = useLocation();
  const { t, i18n } = useTranslation('seo');
  const language = normalizeLanguage(i18n.language);

  useEffect(() => {
    const metadata = routeMetadata(location.pathname, t, language, listing);
    const canonical = localizedUrl(location.pathname, language);

    document.documentElement.lang = language;
    document.title = metadata.title;

    upsertMeta('meta[name="description"]', { name: 'description' }, truncate(metadata.description));
    upsertMeta('meta[name="robots"][data-seo]', { name: 'robots' }, metadata.indexable ? 'index,follow' : 'noindex,nofollow');
    upsertMeta('meta[property="og:title"][data-seo]', { property: 'og:title' }, metadata.title);
    upsertMeta('meta[property="og:description"][data-seo]', { property: 'og:description' }, truncate(metadata.description));
    upsertMeta('meta[property="og:url"][data-seo]', { property: 'og:url' }, canonical);
    upsertMeta('meta[property="og:type"][data-seo]', { property: 'og:type' }, 'website');
    upsertMeta('meta[name="twitter:card"][data-seo]', { name: 'twitter:card' }, 'summary');
    upsertMeta('meta[name="twitter:title"][data-seo]', { name: 'twitter:title' }, metadata.title);
    upsertMeta('meta[name="twitter:description"][data-seo]', { name: 'twitter:description' }, truncate(metadata.description));

    upsertLink('link[rel="canonical"][data-seo]', { rel: 'canonical', href: canonical });
    document.head.querySelectorAll('link[rel="alternate"][data-seo]').forEach((element) => element.remove());
    if (metadata.indexable) {
      SUPPORTED_LANGUAGES.forEach((alternateLanguage) => {
        upsertLink(`link[rel="alternate"][hreflang="${alternateLanguage}"][data-seo]`, {
          rel: 'alternate',
          hrefLang: alternateLanguage,
          href: localizedUrl(location.pathname, alternateLanguage),
        });
      });
      upsertLink('link[rel="alternate"][hreflang="x-default"][data-seo]', {
        rel: 'alternate',
        hrefLang: 'x-default',
        href: localizedUrl(location.pathname, 'en'),
      });
    }
  }, [language, listing, location.pathname, t]);

  return null;
}
