import { Platform } from 'react-native';
import notifee, { AndroidImportance, AndroidCategory } from '@notifee/react-native';

const ANDROID_CHANNEL_APPOINTMENTS = 'spectrum_appointments';

export function isJoinablePushPayload(data = {}) {
  if (!data) return false;
  if (data.action === 'join_session') return Boolean(data.roomId || data.meetingRoomId);
  if (data.screen === 'VideoConsultation') return Boolean(data.roomId || data.meetingRoomId);
  if (data.type === 'appointment' && (data.roomId || data.meetingRoomId)) return true;
  return false;
}

export function normalizePushData(remoteMessage) {
  const data = { ...(remoteMessage?.data || {}) };
  if (!data.roomId && data.meetingRoomId) {
    data.roomId = data.meetingRoomId;
  }
  return data;
}

export async function ensureAppointmentNotificationChannel() {
  if (Platform.OS !== 'android') return ANDROID_CHANNEL_APPOINTMENTS;
  await notifee.createChannel({
    id: ANDROID_CHANNEL_APPOINTMENTS,
    name: 'Appointment Notifications',
    importance: AndroidImportance.HIGH,
  });
  return ANDROID_CHANNEL_APPOINTMENTS;
}

export async function displaySpectrumPushNotification(remoteMessage) {
  const data = normalizePushData(remoteMessage);
  const title = remoteMessage?.notification?.title || data.title || 'Spectrum';
  const body = remoteMessage?.notification?.body || data.body || data.message || '';
  const joinable = isJoinablePushPayload(data);
  const channelId = joinable
    ? await ensureAppointmentNotificationChannel()
    : 'default';

  const actions = joinable
    ? [
        {
          title: data.joinActionLabel || 'Join Session',
          pressAction: { id: 'join_session' },
        },
        {
          title: data.viewActionLabel || 'View',
          pressAction: { id: 'view' },
        },
      ]
    : undefined;

  await notifee.displayNotification({
    id: data.notificationId || `spectrum-${Date.now()}`,
    title,
    body,
    data,
    android: {
      channelId,
      smallIcon: 'ic_notification',
      importance: AndroidImportance.HIGH,
      category: joinable ? AndroidCategory.CALL : AndroidCategory.MESSAGE,
      pressAction: { id: 'default' },
      actions,
      color: '#3A9DB5',
    },
    ios: {
      sound: 'default',
      categoryId: joinable ? 'appointment_join' : undefined,
    },
  });
}
