import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import English translations
import commonEN from './en/common.json';
import authEN from './en/auth.json';
import projectsEN from './en/projects.json';
import decisionsEN from './en/decisions.json';
import errorsEN from './en/errors.json';

// Import German translations
import commonDE from './de/common.json';
import authDE from './de/auth.json';
import projectsDE from './de/projects.json';
import decisionsDE from './de/decisions.json';
import errorsDE from './de/errors.json';

// Configure i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: commonEN,
        auth: authEN,
        projects: projectsEN,
        decisions: decisionsEN,
        errors: errorsEN,
      },
      de: {
        common: commonDE,
        auth: authDE,
        projects: projectsDE,
        decisions: decisionsDE,
        errors: errorsDE,
      },
    },
    lng: 'en', // Default language
    fallbackLng: 'de',
    debug: false,
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'groundsync_language',
    },
  });

// Date formatting helpers
export const formatDate = (timestamp: number | string, locale: string): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

export const formatDateTime = (timestamp: number, locale: string): string => {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export default i18n;
