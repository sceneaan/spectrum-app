import { Platform, Linking } from 'react-native';
import moment from 'moment-timezone';
import Share from 'react-native-share';
import ReactNativeBlobUtil from 'react-native-blob-util';

const formatICSUtc = (m) => `${m.utc().format('YYYYMMDDTHHmmss')}Z`;

const escapeICS = (text = '') => String(text)
  .replace(/\\/g, '\\\\')
  .replace(/;/g, '\\;')
  .replace(/,/g, '\\,')
  .replace(/\n/g, '\\n');

export function buildAppointmentICS({ title, startTime, endTime, notes, location }) {
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@spectrumclinics.care`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Spectrum Clinics//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSUtc(moment())}`,
    `DTSTART:${formatICSUtc(startTime)}`,
    `DTEND:${formatICSUtc(endTime)}`,
    `SUMMARY:${escapeICS(title)}`,
    `DESCRIPTION:${escapeICS(notes)}`,
    `LOCATION:${escapeICS(location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function buildGoogleCalendarUrl({ title, startTime, endTime, notes, location }) {
  const startDate = formatICSUtc(startTime);
  const endDate = formatICSUtc(endTime);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(notes)}&location=${encodeURIComponent(location)}`;
}

/** Share .ics so iOS Calendar can import the appointment event. */
export async function openAppleCalendarWithEvent(options) {
  const ics = buildAppointmentICS(options);
  const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/spectrum-appointment-${Date.now()}.ics`;
  await ReactNativeBlobUtil.fs.writeFile(path, ics, 'utf8');
  const fileUrl = Platform.OS === 'ios' ? path : `file://${path}`;
  await Share.open({
    url: fileUrl,
    type: 'text/calendar',
    filename: 'appointment.ics',
    failOnCancel: false,
  });
}

export async function openGoogleCalendarWithEvent(options) {
  const url = buildGoogleCalendarUrl(options);
  await Linking.openURL(url);
}
