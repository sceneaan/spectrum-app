import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { setNotificationToken, sendActivityHeartbeat } from '../api/services/User.Service';
import logger from './logger';

export async function collectDeviceMetadata(fcmToken) {
  return {
    notificationToken: fcmToken,
    platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : undefined,
    appVersion: DeviceInfo.getVersion(),
    buildNumber: DeviceInfo.getBuildNumber(),
    osVersion: DeviceInfo.getSystemVersion(),
    deviceModel: DeviceInfo.getModel(),
  };
}

export async function registerMobileDevice(fcmToken) {
  if (!fcmToken) return null;

  try {
    const payload = await collectDeviceMetadata(fcmToken);
    return await setNotificationToken(payload);
  } catch (error) {
    logger.debug('[deviceActivity] registerMobileDevice failed:', error?.message || error);
    return null;
  }
}

let lastHeartbeatAt = 0;
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

export async function sendThrottledHeartbeat(fcmToken) {
  const now = Date.now();
  if (now - lastHeartbeatAt < HEARTBEAT_INTERVAL_MS) {
    return null;
  }

  lastHeartbeatAt = now;

  try {
    return await sendActivityHeartbeat(
      fcmToken ? { fcmToken } : {},
    );
  } catch (error) {
    logger.debug('[deviceActivity] heartbeat failed:', error?.message || error);
    return null;
  }
}

export function getSpectrumAppUserAgent() {
  try {
    const version = DeviceInfo.getVersion();
    const build = DeviceInfo.getBuildNumber();
    return `Spectrum/${Platform.OS}/${version} (${build})`;
  } catch {
    return `Spectrum/${Platform.OS}`;
  }
}
