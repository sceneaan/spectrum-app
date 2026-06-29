import React, { useEffect, createContext, useContext } from 'react';
import { View, DeviceEventEmitter, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import SessionTimeoutWarning from './SessionTimeoutWarning';
import { useAuthStore } from '../store/authStore';
import socketService from '../utils/socket';

// Context for session timeout functionality
const SessionTimeoutContext = createContext(null);

/**
 * Hook to access session timeout context
 * Use this to record activity from screens that need manual activity tracking
 */
export function useSessionTimeoutContext() {
  const context = useContext(SessionTimeoutContext);
  if (!context) {
    throw new Error('useSessionTimeoutContext must be used within SessionTimeoutProvider');
  }
  return context;
}

/**
 * Session Timeout Provider
 * Wraps the app to provide session timeout functionality
 * Compliant with Saudi healthcare regulations (NCA ECC, SHIE)
 */
export function SessionTimeoutProvider({ children, navigation }) {
  const { t } = useTranslation();
  const {
    showWarning,
    remainingTime,
    extendSession,
    logout,
    recordActivity,
    warningDuration,
  } = useSessionTimeout();

  // Handle logout with navigation
  const handleLogout = async () => {
    await logout();
    // Navigation will be handled by the auth:sessionTimeout event listener in AppNavigator
  };

  // Get logout from auth store for force logout
  const authLogout = useAuthStore((state) => state.logout);

  // Listen for force logout when user logs in from another device
  useEffect(() => {
    const forceLogoutSubscription = DeviceEventEmitter.addListener('socket:forceLogout', (data) => {
      Alert.alert(
        t('session.forceLogout.title', 'Session Ended'),
        data?.message || t('session.forceLogout.message', 'You have been logged out because your account was accessed from another device.'),
        [
          {
            text: 'OK',
            onPress: () => {
              authLogout();
              socketService.disconnect();
              DeviceEventEmitter.emit('auth:sessionExpired');
            },
          },
        ],
        { cancelable: false }
      );
    });

    return () => {
      forceLogoutSubscription?.remove();
    };
  }, [authLogout, t]);

  const contextValue = {
    recordActivity,
    extendSession,
  };

  return (
    <SessionTimeoutContext.Provider value={contextValue}>
      <View style={{ flex: 1 }} onTouchStart={recordActivity}>
        {children}
        <SessionTimeoutWarning
          visible={showWarning}
          remainingTime={remainingTime}
          onExtend={extendSession}
          onLogout={handleLogout}
          warningDuration={warningDuration}
        />
      </View>
    </SessionTimeoutContext.Provider>
  );
}

export default SessionTimeoutProvider;
