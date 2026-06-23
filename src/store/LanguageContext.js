import React, { createContext, useState, useContext, useEffect } from 'react';
import { Platform, NativeModules } from 'react-native';
import { en } from '../assets/locale/en';
import { ar } from '../assets/locale/ar';
import i18n from '../config/i18n';

const TRANSLATIONS = { en, ar };

const LanguageContext = createContext();

// Function to get device language
const getDeviceLanguage = () => {
  let deviceLanguage = 'en'; // Default fallback

  try {
    if (Platform.OS === 'ios') {
      // iOS
      deviceLanguage = NativeModules.SettingsManager?.settings?.AppleLocale ||
                      NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
                      'en';
    } else {
      // Android
      deviceLanguage = NativeModules.I18nManager?.localeIdentifier || 'en';
    }

    // Extract language code (e.g., 'ar_SA' -> 'ar', 'en_US' -> 'en')
    const languageCode = deviceLanguage.split(/[-_]/)[0].toLowerCase();

    // Return 'ar' if Arabic, otherwise 'en'
    return languageCode === 'ar' ? 'ar' : 'en';
  } catch (error) {
    console.error('Error getting device language:', error);
    return 'en'; // Fallback to English on error
  }
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => getDeviceLanguage());

  const toggleLang = () => {
    const newLang = lang === 'en' ? 'ar' : 'en';
    setLang(newLang);
    i18n.changeLanguage(newLang); // Sync with i18next
  };

  const t = TRANSLATIONS[lang];
  const isRTL = lang === 'ar';

  // Sync initial language with i18next and set RTL
  useEffect(() => {
    i18n.changeLanguage(lang);

    // Force RTL layout for Arabic — requires app restart to take full native effect
    const I18nManager = NativeModules.I18nManager;
    if (I18nManager) {
      const shouldBeRTL = lang === 'ar';
      if (I18nManager.isRTL !== shouldBeRTL) {
        I18nManager.forceRTL(shouldBeRTL);
      }
    }
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

// Alias for backwards compatibility
export const useLanguageStore = useLanguage;