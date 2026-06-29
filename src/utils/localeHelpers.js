/**
 * Interpolate {{key}} placeholders in locale object strings.
 * Used with LanguageContext `t` (nested object), not react-i18next.
 */
export function interpolate(template, values = {}) {
  if (!template || typeof template !== 'string') return template || '';
  return Object.entries(values).reduce(
    (str, [key, val]) => str.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(val ?? '')),
    template,
  );
}

/**
 * Resolve a dotted path on the locale object (e.g. "home.inMinutes").
 */
export function getLocaleString(t, path) {
  return path.split('.').reduce((acc, part) => acc?.[part], t);
}
