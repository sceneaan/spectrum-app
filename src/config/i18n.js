import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Platform, NativeModules } from 'react-native';
import { en } from '../assets/locale/en';
import { ar } from '../assets/locale/ar';

// Function to get device language
const getDeviceLanguage = () => {
  let deviceLanguage = 'en';

  try {
    if (Platform.OS === 'ios') {
      deviceLanguage = NativeModules.SettingsManager?.settings?.AppleLocale ||
                      NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
                      'en';
    } else {
      deviceLanguage = NativeModules.I18nManager?.localeIdentifier || 'en';
    }

    const languageCode = deviceLanguage.split(/[-_]/)[0].toLowerCase();
    return languageCode === 'ar' ? 'ar' : 'en';
  } catch (error) {
    console.error('Error getting device language:', error);
    return 'en';
  }
};

const deviceLanguage = getDeviceLanguage();

// Configure i18next
i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    compatibilityJSON: 'v3', // For React Native compatibility
    resources: {
      en: {
        translation: en,
      },
      ar: {
        translation: ar,
      },
    },
    lng: deviceLanguage, // Use device language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

// Add dir() method to i18n instance to support RTL detection
i18n.dir = (lng) => {
  const language = lng || i18n.language;
  return language === 'ar' ? 'rtl' : 'ltr';
};

export default i18n;
