import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import enCommon from '@/locales/en/common.json';
import enAuth from '@/locales/en/auth.json';
import enProfile from '@/locales/en/profile.json';
import enListings from '@/locales/en/listings.json';
import enMatching from '@/locales/en/matching.json';
import enChat from '@/locales/en/chat.json';
import enHome from '@/locales/en/home.json';

import plCommon from '@/locales/pl/common.json';
import plAuth from '@/locales/pl/auth.json';
import plProfile from '@/locales/pl/profile.json';
import plListings from '@/locales/pl/listings.json';
import plMatching from '@/locales/pl/matching.json';
import plChat from '@/locales/pl/chat.json';
import plHome from '@/locales/pl/home.json';

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    profile: enProfile,
    listings: enListings,
    matching: enMatching,
    chat: enChat,
    home: enHome,
  },
  pl: {
    common: plCommon,
    auth: plAuth,
    profile: plProfile,
    listings: plListings,
    matching: plMatching,
    chat: plChat,
    home: plHome,
  },
};

const SUPPORTED_LANGUAGES = ['pl', 'en'];

/**
 * Map IANA timezone -> language code.
 * Used as a lightweight, offline geo-language hint so visitors from Poland
 * see Polish even when their OS/browser is set to English.
 *
 * Add more entries here as we add more locales.
 */
const TIMEZONE_TO_LANG = {
  'Europe/Warsaw': 'pl',
};

const detectFromTimezone = () => {
  if (typeof Intl === 'undefined' || typeof Intl.DateTimeFormat !== 'function') {
    return null;
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TIMEZONE_TO_LANG[tz] || null;
  } catch {
    return null;
  }
};

const detectFromNavigator = () => {
  if (typeof navigator === 'undefined') return null;

  const candidates = Array.isArray(navigator.languages)
    ? navigator.languages
    : [navigator.language || navigator.userLanguage].filter(Boolean);

  // Step 1 — explicit region match (e.g. en-PL, de-PL → Polish, the user's location)
  for (const tag of candidates) {
    if (!tag) continue;
    const region = tag.split('-')[1];
    if (region && region.toLowerCase() === 'pl') return 'pl';
  }

  // Step 2 — primary language match (pl, en, etc.)
  for (const tag of candidates) {
    if (!tag) continue;
    const primary = tag.split('-')[0].toLowerCase();
    if (SUPPORTED_LANGUAGES.includes(primary)) return primary;
  }

  return null;
};

const detector = new LanguageDetector();
detector.addDetector({
  name: 'geo',
  lookup: () => detectFromTimezone() || detectFromNavigator() || null,
  cacheUserLanguage: () => {
    // Caching is handled by the localStorage detector once a value is chosen.
  },
});

i18n
  .use(detector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    defaultNS: 'common',
    ns: ['common', 'auth', 'profile', 'listings', 'matching', 'chat', 'home'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      // localStorage first so any explicit user choice wins forever.
      // geo is our timezone+region hint, navigator/htmlTag are the safety nets.
      order: ['localStorage', 'geo', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;
