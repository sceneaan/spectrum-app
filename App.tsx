import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from './src/store/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import { requestUserPermission } from './src/utils/notificationService'; // Import the utility
import { useAuthStore } from './src/store/authStore'; // Import the auth store
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import BootSplash from "react-native-bootsplash";
import * as Sentry from '@sentry/react-native';
import { SessionTimeoutProvider } from './src/components/SessionTimeoutProvider'; // Session timeout for healthcare compliance

Sentry.init({
  dsn: 'https://c68e58ce3455b390446a130ab4414277@o4510318499069952.ingest.us.sentry.io/4510466371682304',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});
import './src/config/i18n'; // Initialize i18n configuration

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const App = () => {
  const { user, token } = useAuthStore(); // Access auth store
  
  useEffect(() => {
    const init = async () => {
      // …do multiple sync or async tasks
    };

    init().finally(async () => {
      await BootSplash.hide({ fade: true });
      console.log("BootSplash has been hidden successfully");
    });
  }, []);

  useEffect(() => {
    // Request notification permissions and register token on app start
    const initNotifications = async () => {
      // Pass role and token from auth store. Default to 'patient' if role is not available yet.
      await requestUserPermission(user?.role || 'patient', token); 
    };
    initNotifications();
  }, [user, token]); // Re-run if user or token changes (e.g., after login/logout)

  useEffect(() => {
    // Create notification channel for Android
    const createNotificationChannel = async () => {
      try {
        await notifee.createChannel({
          id: 'default',
          name: 'Default Channel',
          importance: AndroidImportance.HIGH,
        });
      } catch (error) {
        console.error('Error creating notification channel:', error);
      }
    };

    // Only create channel on Android
    if (Platform.OS === 'android') {
      createNotificationChannel();
    }

    // Handle foreground messages (when app is open)
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      try {
        // Display notification manually when app is in foreground
        await notifee.displayNotification({
          title: remoteMessage.notification?.title || 'New Message',
          body: remoteMessage.notification?.body || 'You have a new notification',
          data: remoteMessage.data,
          android: {
            channelId: 'default',
            smallIcon: 'ic_notification', // Ensure this resource exists or use 'ic_launcher'
            pressAction: {
              id: 'default',
            },
            importance: AndroidImportance.HIGH,
            color: '#2196F3',
            sound: 'default',
            vibrationPattern: [300, 500],
          },
          ios: {
            foregroundPresentationOptions: {
              badge: true,
              sound: true,
              banner: true,
              list: true,
            },
            sound: 'default',
            badge: 1,
          },
        });
      } catch (error) {
        console.error('Error displaying foreground notification:', error);
        // Fallback
        try {
           await notifee.displayNotification({
            title: remoteMessage.notification?.title,
            body: remoteMessage.notification?.body,
            android: { channelId: 'default' }
           });
        } catch(e) {
          console.error('Fallback failed', e);
        }
      }
    });

    return unsubscribe;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <LanguageProvider>
          <SessionTimeoutProvider>
            <AppNavigator />
          </SessionTimeoutProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
};

export default Sentry.wrap(App);