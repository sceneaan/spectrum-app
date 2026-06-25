import { DeviceEventEmitter } from 'react-native';

export const FCM_FOREGROUND_EVENT = 'fcm:foreground';

export function emitForegroundMessage(remoteMessage) {
  DeviceEventEmitter.emit(FCM_FOREGROUND_EVENT, remoteMessage);
}
