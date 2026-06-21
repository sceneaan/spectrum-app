import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import en from '../assets/locales/en.json';
import ar from '../assets/locales/ar.json';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: I18nManager.isRTL ? 'ar' : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;