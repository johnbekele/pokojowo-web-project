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

import plCommon from '@/locales/pl/common.json';
import plAuth from '@/locales/pl/auth.json';
import plProfile from '@/locales/pl/profile.json';
import plListings from '@/locales/pl/listings.json';
import plMatching from '@/locales/pl/matching.json';
import plChat from '@/locales/pl/chat.json';

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    profile: enProfile,
    listings: enListings,
    matching: enMatching,
    chat: enChat,
  },
  pl: {
    common: plCommon,
    auth: plAuth,
    profile: plProfile,
    listings: plListings,
    matching: plMatching,
    chat: plChat,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'auth', 'profile', 'listings', 'matching', 'chat'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;
