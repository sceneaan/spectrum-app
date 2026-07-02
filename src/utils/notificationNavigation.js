import { NOTIFICATION_TYPES } from '../api/services/Notification.Service';
import { parseSafeJson } from './parseSafeJson';

export function parseNotificationParams(raw) {
  return parseSafeJson(raw);
}

/**
 * Resolve stack/tab target from an in-app notification record.
 * Returns { screen, params } or null when no navigation applies.
 */
export function resolveNotificationNavigation(item) {
  if (!item) return null;

  const data = item.data || {};

  if (data.screen && typeof data.screen === 'string') {
    return {
      screen: data.screen,
      params: parseNotificationParams(data.params),
    };
  }

  const appointmentId = data.appointmentId || data.id;

  switch (item.type) {
    case NOTIFICATION_TYPES.APPOINTMENT:
      if (data.roomId || data.meetingRoomId) {
        return {
          screen: 'VideoConsultation',
          params: {
            meetingRoomId: data.roomId || data.meetingRoomId,
            roomId: data.roomId || data.meetingRoomId,
          },
        };
      }
      if (appointmentId) {
        return {
          screen: 'Main',
          params: { screen: 'AppointmentsTab' },
        };
      }
      return { screen: 'Main', params: { screen: 'AppointmentsTab' } };

    case NOTIFICATION_TYPES.MESSAGE:
      if (data.threadId) {
        return {
          screen: 'ChatDetails',
          params: {
            threadId: data.threadId,
            thread: data.thread,
            providerId: data.providerId,
            providerName: data.providerName,
          },
        };
      }
      return { screen: 'Main', params: { screen: 'InboxTab' } };

    case NOTIFICATION_TYPES.WALLET:
    case NOTIFICATION_TYPES.PAYMENT:
    case NOTIFICATION_TYPES.SUPPORT_CARD:
      return { screen: 'WalletScreen', params: {} };

    case NOTIFICATION_TYPES.PRESCRIPTION:
    case NOTIFICATION_TYPES.REFILL_REQUEST:
      return { screen: 'RefillRequestScreen', params: {} };

    case NOTIFICATION_TYPES.MEDICAL_REPORT:
      return { screen: 'MedicalReportsScreen', params: {} };

    case NOTIFICATION_TYPES.SURVEY:
      return { screen: 'Main', params: { screen: 'HomeTab' } };

    default:
      return null;
  }
}
