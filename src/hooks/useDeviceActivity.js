import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { useAuthStore } from '../store/authStore';
import { registerMobileDevice, sendThrottledHeartbeat } from '../utils/deviceActivity';

const FOREGROUND_HEARTBEAT_MS = 5 * 60 * 1000;

/**
 * Registers the device after login and sends throttled heartbeats while the app is in use.
 */
export function useDeviceActivity() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const hasRegisteredRef = useRef(false);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) {
      hasRegisteredRef.current = false;
      return undefined;
    }

    let cancelled = false;

    const syncActivity = async ({ forceRegister = false } = {}) => {
      if (cancelled || !useAuthStore.getState().isAuthenticated) return;

      try {
        const fcmToken = await messaging().getToken();
        if (!fcmToken || cancelled) return;

        if (forceRegister || !hasRegisteredRef.current) {
          await registerMobileDevice(fcmToken);
          hasRegisteredRef.current = true;
          return;
        }

        await sendThrottledHeartbeat(fcmToken);
      } catch {
        // Non-blocking background sync
      }
    };

    syncActivity({ forceRegister: true });

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        syncActivity();
      }
    });

    const intervalId = setInterval(() => {
      if (AppState.currentState === 'active') {
        syncActivity();
      }
    }, FOREGROUND_HEARTBEAT_MS);

    return () => {
      cancelled = true;
      appStateSub.remove();
      clearInterval(intervalId);
    };
  }, [hasHydrated, isAuthenticated]);
}

export default useDeviceActivity;
