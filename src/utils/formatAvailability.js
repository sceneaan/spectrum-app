import moment from 'moment-timezone';

const DEFAULT_TZ = 'Asia/Riyadh';

/**
 * Badge text for a provider's next open slot (Today / Tomorrow / Next: MMM D).
 */
export function formatNextAvailabilityLabel(rawDate, options = {}) {
  const {
    todayLabel = 'Today',
    tomorrowLabel = 'Tomorrow',
    nextPrefix = 'Next:',
    locale = 'en',
    timezone = DEFAULT_TZ,
  } = options;

  if (!rawDate) return null;

  const slotDay = moment.tz(rawDate, timezone).startOf('day');
  if (!slotDay.isValid()) return null;

  const today = moment().tz(timezone).startOf('day');
  const tomorrow = today.clone().add(1, 'day');

  if (slotDay.isSame(today, 'day')) {
    return todayLabel;
  }
  if (slotDay.isSame(tomorrow, 'day')) {
    return tomorrowLabel;
  }

  return `${nextPrefix} ${slotDay.locale(locale).format('MMM D')}`;
}
