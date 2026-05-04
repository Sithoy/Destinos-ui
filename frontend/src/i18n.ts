import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './locales/en';
import { pt } from './locales/pt';

export const defaultLanguage = 'pt';
export const supportedLanguages = ['en', 'pt'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

function resolveInitialLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return defaultLanguage;

  const savedLanguage = window.localStorage.getItem('dpm-language');
  if (savedLanguage === 'en' || savedLanguage === 'pt') return savedLanguage;

  const browserLanguage = window.navigator.language.toLowerCase();
  return browserLanguage.startsWith('pt') ? 'pt' : defaultLanguage;
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    pt: { translation: pt },
  },
  lng: resolveInitialLanguage(),
  fallbackLng: defaultLanguage,
  supportedLngs: supportedLanguages,
  interpolation: {
    escapeValue: false,
  },
});

i18n.on('languageChanged', (language) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language;
  }

  if (typeof window !== 'undefined') {
    window.localStorage.setItem('dpm-language', language);
  }
});

if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.language;
}

export default i18n;
