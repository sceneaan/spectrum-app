import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { Logout } from '../api/services/Auth.Service';

// Session timeout duration in milliseconds (15 minutes for healthcare compliance)
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE_TIMEOUT_MS = 2 * 60 * 1000; // Show warning 2 minutes before timeout
const BACKGROUND_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes when app is in background

/**
 * Hook for managing session timeout based on user inactivity
 * Compliant with Saudi healthcare regulations (NCA ECC, SHIE)
 *
 * Features:
 * - Tracks user activity via touch events
 * - Handles app background/foreground state
 * - Shows warning before session expires
 * - Automatically logs out user after inactivity period
 * - Shorter timeout when app is in background
 */
export function useSessionTimeout() {
  const { token, logout: storeLogout } = useAuthStore();

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
    }
    try {
      await Logout();
    } catch (error) {
      console.warn('Logout failed during session timeout:', error);
    }
    await storeLogout();
    // Emit event for navigation handling
    DeviceEventEmitter.emit('auth:sessionTimeout', { reason: 'inactivity' });
  }, [storeLogout]);

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

    // Only set timers if user is authenticated
    if (!token) return;

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
        // App came to foreground
        if (backgroundTimestampRef.current) {
          const timeInBackground = Date.now() - backgroundTimestampRef.current;

          // If app was in background longer than background timeout, logout
          if (timeInBackground >= BACKGROUND_TIMEOUT_MS) {
            handleSessionTimeout();
            return;
          }

          // Otherwise, check if total inactivity exceeds session timeout
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
    backgroundTimeout: BACKGROUND_TIMEOUT_MS,
  };
}

export default useSessionTimeout;
