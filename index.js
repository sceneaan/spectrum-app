/**
 * @format
 */
// Suppress Firebase deprecation warnings
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

import { AppRegistry, Platform } from 'react-native';
import { enableScreens } from 'react-native-screens';
import App from './App';
import { name as appName } from './app.json';

// Workaround for Fabric view recycling crash on Android
// https://github.com/software-mansion/react-native-screens/issues/1422
if (Platform.OS === 'android') {
  enableScreens(false);
}
import messaging from '@react-native-firebase/messaging';
import { displaySpectrumPushNotification } from './src/utils/pushNotifications';

// IMPORTANT: Register the app component FIRST before setting up background handlers
AppRegistry.registerComponent(appName, () => App);

// Handle background messages - Set this AFTER app registration
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  try {
    await displaySpectrumPushNotification(remoteMessage);
  } catch (error) {
    console.error('Error displaying background notification:', error);
  }
});
