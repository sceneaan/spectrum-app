import React, { useEffect } from 'react';
import { Platform, DeviceEventEmitter } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/api/queryClient';
import { LanguageProvider } from './src/store/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import { requestUserPermission } from './src/utils/notificationService';
import { useAuthStore } from './src/store/authStore';
import { useAuthSessionRefresh } from './src/hooks/useAuthSessionRefresh';
import { useDeviceActivity } from './src/hooks/useDeviceActivity';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { initPushNotificationHandlers } from './src/utils/pushNotificationHandlers';
import { ensureAppointmentNotificationChannel } from './src/utils/pushNotifications';
import * as Sentry from '@sentry/react-native';
import { SessionTimeoutProvider } from './src/components/SessionTimeoutProvider';
import AppErrorBoundary from './src/components/AppErrorBoundary';
import { fullLogout } from './src/utils/fullLogout';
import './src/config/i18n';
import socketService from './src/utils/socket';

Sentry.init({
  dsn: 'https://c68e58ce3455b390446a130ab4414277@o4510318499069952.ingest.us.sentry.io/4510466371682304',
  sendDefaultPii: false,
  enableLogs: true,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: __DEV__ ? 0 : 0.15,
  integrations: [Sentry.feedbackIntegration()],
});

const App = () => {
  const { user, token, isAuthenticated } = useAuthStore();

  useAuthSessionRefresh();
  useDeviceActivity();

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
    const initNotifications = async () => {
      await requestUserPermission(user?.role || 'patient', token);
    };
    initNotifications();
  }, [user, token]);

  useEffect(() => {
    initPushNotificationHandlers();
  }, []);

  useEffect(() => {
    const authErrorSub = DeviceEventEmitter.addListener('socket:authError', async () => {
      await fullLogout({ callServer: false });
      DeviceEventEmitter.emit('auth:sessionExpired');
    });
    return () => authErrorSub.remove();
  }, []);

  useEffect(() => {
    const createNotificationChannel = async () => {
      try {
        await notifee.createChannel({
          id: 'default',
          name: 'Default Channel',
          importance: AndroidImportance.HIGH,
        });
        await ensureAppointmentNotificationChannel();
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
          <AppErrorBoundary>
            <SessionTimeoutProvider>
              <AppNavigator />
            </SessionTimeoutProvider>
          </AppErrorBoundary>
        </LanguageProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
};

export default Sentry.wrap(App);
