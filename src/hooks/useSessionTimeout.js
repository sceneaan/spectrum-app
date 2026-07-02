import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { fullLogout } from '../utils/fullLogout';
import socketService from '../utils/socket';
import { isSessionTimeoutPaused } from '../utils/sessionPause';

// Session timeout duration in milliseconds (15 minutes for healthcare compliance)
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE_TIMEOUT_MS = 2 * 60 * 1000; // Show warning 2 minutes before timeout

/**
 * Hook for managing session timeout based on user inactivity.
 * Background privacy is handled by BiometricLockModal — not full logout.
 *
 * Features:
 * - Tracks user activity via touch events
 * - Shows warning before session expires
 * - Logs out after 15 minutes of true inactivity (including time in background)
 */
export function useSessionTimeout() {
  const { token } = useAuthStore();

  const timeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const appStateRef = useRef(AppState.currentState);
  const backgroundTimestampRef = useRef(null);

  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(WARNING_BEFORE_TIMEOUT_MS);
  const countdownIntervalRef = useRef(null);

  // Handle session timeout - logout user
  const handleSessionTimeout = useCallback(async () => {
    setShowWarning(false);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (isSessionTimeoutPaused()) return;
    try {
      await fullLogout();
    } catch (error) {
      console.warn('Logout failed during session timeout:', error);
    }
    DeviceEventEmitter.emit('auth:sessionTimeout', { reason: 'inactivity' });
  }, []);

  // Reset the inactivity timer
  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);

    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    // Only set timers if user is authenticated and timeout is not paused (e.g. video call)
    if (!token || isSessionTimeoutPaused()) return;

    // Set warning timer (fires 2 minutes before timeout)
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true);
      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - lastActivityRef.current;
        const remaining = SESSION_TIMEOUT_MS - elapsed;
        if (remaining <= 0) {
          clearInterval(countdownIntervalRef.current);
        } else {
          setRemainingTime(remaining);
        }
      }, 1000);
    }, SESSION_TIMEOUT_MS - WARNING_BEFORE_TIMEOUT_MS);

    // Set session timeout timer
    timeoutRef.current = setTimeout(() => {
      handleSessionTimeout();
    }, SESSION_TIMEOUT_MS);
  }, [token, handleSessionTimeout]);

  // Extend session (user clicked "Stay logged in")
  const extendSession = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  // Record user activity (called from touch handlers)
  const recordActivity = useCallback(() => {
    const now = Date.now();
    // Throttle to avoid excessive timer resets
    if (now - lastActivityRef.current > 1000) {
      resetTimer();
    }
  }, [resetTimer]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    if (!token) return;

    const handleAppStateChange = (nextAppState) => {
      const previousState = appStateRef.current;

      if (previousState.match(/inactive|background/) && nextAppState === 'active') {
        if (isSessionTimeoutPaused()) {
          backgroundTimestampRef.current = null;
          appStateRef.current = nextAppState;
          return;
        }

        // App came to foreground — logout only if total idle time exceeds limit
        if (backgroundTimestampRef.current) {
          const totalInactivity = Date.now() - lastActivityRef.current;
          if (totalInactivity >= SESSION_TIMEOUT_MS) {
            handleSessionTimeout();
            return;
          }
        }

        // Resume normal activity tracking
        backgroundTimestampRef.current = null;
        resetTimer();
      } else if (nextAppState.match(/inactive|background/)) {
        if (isSessionTimeoutPaused()) {
          appStateRef.current = nextAppState;
          return;
        }

        // App went to background
        backgroundTimestampRef.current = Date.now();

        // Clear foreground timers
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        if (warningTimeoutRef.current) {
          clearTimeout(warningTimeoutRef.current);
        }
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
        setShowWarning(false);
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Initialize timer
    resetTimer();

    return () => {
      subscription?.remove();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [token, resetTimer, handleSessionTimeout]);

  // Cleanup on unmount or token change
  useEffect(() => {
    if (!token) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setShowWarning(false);
    }
  }, [token]);

  return {
    showWarning,
    remainingTime,
    extendSession,
    logout: handleSessionTimeout,
    recordActivity,
    timeoutDuration: SESSION_TIMEOUT_MS,
    warningDuration: WARNING_BEFORE_TIMEOUT_MS,
  };
}

export default useSessionTimeout;
