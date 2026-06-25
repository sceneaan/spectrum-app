import { DeviceEventEmitter } from 'react-native';
import notifee, { EventType } from '@notifee/react-native';
import { navigateFromNotification } from '../navigation/AppNavigator';
import { normalizePushData } from './pushNotifications';

export const PRE_SESSION_JOIN_EVENT = '__pre_session_join__';

export function emitPreSessionJoinFromPush(data) {
  const normalized = normalizePushData({ data });
  if (!normalized.roomId && !normalized.meetingRoomId) return false;

  DeviceEventEmitter.emit(PRE_SESSION_JOIN_EVENT, {
    roomId: normalized.roomId || normalized.meetingRoomId,
    meetingRoomId: normalized.roomId || normalized.meetingRoomId,
    userName: normalized.userName,
    providerName: normalized.providerName,
    fromPush: true,
  });
  return true;
}

function handleNotifeeInteraction(detail) {
  const data = detail?.notification?.data || {};
  const actionId = detail?.pressAction?.id || 'default';

  if (actionId === 'join_session') {
    emitPreSessionJoinFromPush(data);
    return;
  }

  if (actionId === 'view' || actionId === 'default') {
    navigateFromNotification({ data });
  }
}

export function initPushNotificationHandlers() {
  notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.ACTION_PRESS || type === EventType.PRESS) {
      handleNotifeeInteraction(detail);
    }
  });

  notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type === EventType.ACTION_PRESS || type === EventType.PRESS) {
      handleNotifeeInteraction(detail);
    }
  });
}
