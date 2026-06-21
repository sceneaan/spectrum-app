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
import notifee, { AndroidImportance } from '@notifee/react-native';

// IMPORTANT: Register the app component FIRST before setting up background handlers
AppRegistry.registerComponent(appName, () => App);

// Handle background messages - Set this AFTER app registration
// This prevents blocking the app startup
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Background message received:', remoteMessage);
  try {
    await notifee.displayNotification({
      title: remoteMessage.notification?.title || 'New Message',
      body: remoteMessage.notification?.body || 'You have a new notification',
      data: remoteMessage.data,
      android: {
        channelId: 'default',
        smallIcon: 'ic_notification',
        pressAction: {
          id: 'default',
        },
        importance: AndroidImportance.HIGH,
        color: '#2196F3',
      },
      ios: {
        sound: 'default',
        badge: 1,
      },
    });
  } catch (error) {
    console.error('Error displaying background notification:', error);
  }
});
