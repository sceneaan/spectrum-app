import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { refreshTokenIfNeeded } from '../utils/tokenRefresh';

/**
 * Proactively refresh access tokens while authenticated:
 * - every minute when expiring soon
 * - on app resume (foreground)
 * - once on mount (cold start / rehydrate)
 */
export function useAuthSessionRefresh() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    refreshTokenIfNeeded();

    const interval = setInterval(refreshTokenIfNeeded, 60 * 1000);

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshTokenIfNeeded();
      }
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [isAuthenticated]);
}

export default useAuthSessionRefresh;
