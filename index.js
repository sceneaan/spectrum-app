/**
 * @format
 */
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

import { AppRegistry, Platform } from 'react-native';
import { enableScreens } from 'react-native-screens';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { displaySpectrumPushNotification } from './src/utils/pushNotifications';
import { name as appName } from './app.json';

if (Platform.OS === 'android') {
  enableScreens(false);
}

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  try {
    await displaySpectrumPushNotification(remoteMessage);
  } catch (error) {
    console.error('Error displaying background notification:', error);
  }
});

AppRegistry.registerComponent(appName, () => App);
