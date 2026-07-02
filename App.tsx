import React, { useEffect } from 'react';
import { Platform, DeviceEventEmitter } from 'react-native';
import BootSplash from 'react-native-bootsplash';
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

try {
  Sentry.init({
    dsn: 'https://c68e58ce3455b390446a130ab4414277@o4510318499069952.ingest.us.sentry.io/4510466371682304',
    sendDefaultPii: false,
    enableLogs: true,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: __DEV__ ? 0 : 0.15,
    integrations: [Sentry.feedbackIntegration()],
  });
} catch (error) {
  console.warn('Sentry init skipped:', error);
}

const App = () => {
  const { user, token, isAuthenticated, _hasHydrated } = useAuthStore();

  useAuthSessionRefresh();

  useEffect(() => {
    BootSplash.hide({ fade: true }).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrationFallback = setTimeout(() => {
      if (!cancelled && !useAuthStore.getState()._hasHydrated) {
        useAuthStore.getState().setHasHydrated(true);
      }
    }, 1500);

    const unsubFinishHydration = useAuthStore.persist.onFinishHydration(() => {
      if (!cancelled) {
        useAuthStore.getState().setHasHydrated(true);
      }
    });

    try {
      useAuthStore.persist.rehydrate();
    } catch (error) {
      console.warn('Auth rehydrate failed:', error);
      useAuthStore.getState().setHasHydrated(true);
    }

    return () => {
      cancelled = true;
      clearTimeout(hydrationFallback);
      unsubFinishHydration?.();
    };
  }, []);

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
    if (!_hasHydrated) return;

    const initNotifications = async () => {
      try {
        await requestUserPermission(user?.role || 'patient', token);
      } catch (error) {
        console.warn('Notification init skipped:', error?.message || error);
      }
    };

    initNotifications();
  }, [_hasHydrated, user?.role, token]);

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

const RootApp = (() => {
  try {
    return Sentry.wrap(App);
  } catch {
    return App;
  }
})();

export default RootApp;
