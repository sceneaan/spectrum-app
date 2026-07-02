/** Parse JSON notification/deep-link params without throwing. */
export function parseSafeJson(raw) {
  if (!raw) return undefined;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return undefined;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}
