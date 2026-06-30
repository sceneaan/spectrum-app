/** Normalize person names for display (e.g. "Saudi PAtient" → "Saudi Patient"). */
export function formatPersonName(name) {
  if (!name || typeof name !== 'string') return '';

  return name
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (!word) return '';
      if (word.length <= 3 && word === word.toUpperCase()) return word;
      const lower = word.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}
