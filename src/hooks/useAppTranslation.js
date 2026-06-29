import { useCallback } from 'react';
import { I18nManager } from 'react-native';
import { useLanguage } from '../store/LanguageContext';
import { interpolate } from '../utils/localeHelpers';

function resolveLocaleKey(obj, key) {
  if (!key || !obj) return undefined;
  return key.split('.').reduce((acc, part) => acc?.[part], obj);
}

/**
 * i18next-compatible `t('dotted.key', default)` backed by LanguageContext locale objects.
 * Use in auth screens so login/OTP share one translation source with the rest of the app.
 */
export function useAppTranslation() {
  const { t: tObj, lang, isRTL, toggleLang } = useLanguage();

  const t = useCallback((key, defaultOrOptions, maybeOptions) => {
    let defaultValue;
    let options;
    if (typeof defaultOrOptions === 'string') {
      defaultValue = defaultOrOptions;
      options = maybeOptions;
    } else if (defaultOrOptions && typeof defaultOrOptions === 'object') {
      options = defaultOrOptions;
    }

    const resolved = resolveLocaleKey(tObj, key);
    if (resolved === undefined || resolved === null) {
      return defaultValue ?? key;
    }
    if (typeof resolved === 'string' && options && typeof options === 'object') {
      return interpolate(resolved, options);
    }
    return resolved;
  }, [tObj]);

  return {
    t,
    tObj,
    lang,
    isRTL: isRTL || I18nManager.isRTL,
    i18n: { language: lang },
    toggleLang,
  };
}

export default useAppTranslation;
