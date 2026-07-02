import moment from 'moment-timezone';
import 'moment/locale/ar';

export function formatLocalizedDate(date, format = 'MMM D, YYYY', isRTL = false) {
  if (!date) return '';
  const m = moment.utc(date);
  if (isRTL) m.locale('ar');
  else m.locale('en');
  return m.format(format);
}

export function formatLocalizedTime(date, format = 'h:mm A', isRTL = false) {
  if (!date) return '';
  const m = moment(date);
  if (isRTL) m.locale('ar');
  else m.locale('en');
  return m.format(format);
}

export function formatLocalizedDateTime(date, dateFormat = 'MMM D, YYYY', timeFormat = 'h:mm A', isRTL = false) {
  return `${formatLocalizedDate(date, dateFormat, isRTL)} ${formatLocalizedTime(date, timeFormat, isRTL)}`.trim();
}
