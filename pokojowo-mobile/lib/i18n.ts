import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { storage, STORAGE_KEYS } from './storage';

// Import translations
import enCommon from '@/locales/en/common.json';
import enAuth from '@/locales/en/auth.json';
import enProfile from '@/locales/en/profile.json';
import enListings from '@/locales/en/listings.json';
import enMatching from '@/locales/en/matching.json';
import enChat from '@/locales/en/chat.json';
import enLandlord from '@/locales/en/landlord.json';

import plCommon from '@/locales/pl/common.json';
import plAuth from '@/locales/pl/auth.json';
import plProfile from '@/locales/pl/profile.json';
import plListings from '@/locales/pl/listings.json';
import plMatching from '@/locales/pl/matching.json';
import plChat from '@/locales/pl/chat.json';
import plLandlord from '@/locales/pl/landlord.json';

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    profile: enProfile,
    listings: enListings,
    matching: enMatching,
    chat: enChat,
    landlord: enLandlord,
  },
  pl: {
    common: plCommon,
    auth: plAuth,
    profile: plProfile,
    listings: plListings,
    matching: plMatching,
    chat: plChat,
    landlord: plLandlord,
  },
};

// Get device locale
const deviceLocale = Localization.getLocales()[0]?.languageCode || 'en';

// Initialize i18n
i18n.use(initReactI18next).init({
  resources,
  lng: deviceLocale === 'pl' ? 'pl' : 'en', // Default to device locale, fallback to en
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'auth', 'profile', 'listings', 'matching', 'chat', 'landlord'],
  pluralSeparator: '_',
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v4', // Required for some Android devices
});

// Load saved language preference
async function loadSavedLanguage() {
  try {
    const savedLanguage = await storage.getItem(STORAGE_KEYS.LANGUAGE);
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'pl')) {
      await i18n.changeLanguage(savedLanguage);
    }
  } catch (error) {
    console.error('Failed to load saved language:', error);
  }
}

// Call on app startup
loadSavedLanguage();

/**
 * Change language and persist preference
 */
export async function changeLanguage(lang: 'en' | 'pl'): Promise<void> {
  await i18n.changeLanguage(lang);
  await storage.setItem(STORAGE_KEYS.LANGUAGE, lang);
}

export default i18n;
