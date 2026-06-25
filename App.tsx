import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/api/queryClient';
import { LanguageProvider } from './src/store/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import { requestUserPermission } from './src/utils/notificationService'; // Import the utility
import { useAuthStore } from './src/store/authStore'; // Import the auth store
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
import socketService from './src/utils/socket';

const App = () => {
  const { user, token, isAuthenticated, isTokenExpiringSoon, refreshToken, updateTokens } = useAuthStore();

  useEffect(() => {
    BootSplash.hide({ fade: true });
  }, []);

  // Proactively refresh token 5 minutes before it expires
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      if (isTokenExpiringSoon() && refreshToken) {
        try {
          const response = await fetch(`${require('./src/config').environmentUrls.api_url}/auth/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          if (response.ok) {
            const data = await response.json();
            const { token: newToken, refreshToken: newRefreshToken, expiresIn } = data.data;
            updateTokens(newToken, newRefreshToken, expiresIn);
            socketService.updateToken();
          }
        } catch {
          // Proactive refresh failed — reactive refresh on next 401 will handle it
        }
      }
    }, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, [isAuthenticated, refreshToken, updateTokens]);

  // Keep socket connected for authenticated users (appointments, video, chat)
  useEffect(() => {
    if (!isAuthenticated || !user) {
      socketService.disconnect();
      return;
    }

    const authUserId = user.id || user._id;
    if (!authUserId) return;

    socketService.connect(String(authUserId)).catch(() => {});
  }, [isAuthenticated, user?.id, user?._id]);

  useEffect(() => {
    // Request notification permissions and register token on app start
    const initNotifications = async () => {
      // Pass role and token from auth store. Default to 'patient' if role is not available yet.
      await requestUserPermission(user?.role || 'patient', token); 
    };
    initNotifications();
  }, [user, token]); // Re-run if user or token changes (e.g., after login/logout)

  useEffect(() => {
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

    if (Platform.OS === 'android') {
      createNotificationChannel();
    }
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