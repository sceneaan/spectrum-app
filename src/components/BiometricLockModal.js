import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  AppState,
  Modal,
  DeviceEventEmitter,
  InteractionManager,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ReactNativeBiometrics from 'react-native-biometrics';
import { useAuthStore } from '../store/authStore';
import { useLanguage } from '../store/LanguageContext';
import { fullLogout } from '../utils/fullLogout';
import { AppText, AppButton } from './ui';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';

const rnBiometrics = new ReactNativeBiometrics();
const LOCK_AFTER_MS = 5 * 60 * 1000;

const BiometricLockModal = () => {
  const { isAuthenticated, biometricsEnabled } = useAuthStore();
  const { t } = useLanguage();
  const [locked, setLocked] = useState(false);
  const [biometryType, setBiometryType] = useState(null);
  const [sensorReady, setSensorReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const appStateRef = useRef(AppState.currentState);
  const backgroundedAtRef = useRef(null);
  const promptInFlightRef = useRef(false);
  const autoPromptTaskRef = useRef(null);

  useEffect(() => {
    if (!biometricsEnabled) {
      setBiometryType(null);
      setSensorReady(false);
      return;
    }

    let cancelled = false;
    rnBiometrics.isSensorAvailable()
      .then(({ available, biometryType: type }) => {
        if (cancelled) return;
        if (available && type) {
          setBiometryType(type);
          setSensorReady(true);
        } else {
          setBiometryType(null);
          setSensorReady(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBiometryType(null);
          setSensorReady(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [biometricsEnabled]);

  useEffect(() => {
    if (!biometricsEnabled) {
      setLocked(false);
      setAuthError('');
    }
  }, [biometricsEnabled]);

  useEffect(() => {
    if (!biometricsEnabled || !isAuthenticated) return;

    const sub = AppState.addEventListener('change', (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if (prev === 'active' && (nextState === 'background' || nextState === 'inactive')) {
        backgroundedAtRef.current = Date.now();
      } else if ((prev === 'background' || prev === 'inactive') && nextState === 'active') {
        const elapsed = Date.now() - (backgroundedAtRef.current || 0);
        if (elapsed >= LOCK_AFTER_MS) {
          setLocked(true);
          setAuthError('');
        }
      }
    });

    return () => sub.remove();
  }, [biometricsEnabled, isAuthenticated]);

  const getBiometryLabel = useCallback(() => {
    if (biometryType === 'FaceID') return 'Face ID';
    if (biometryType === 'TouchID') return 'Touch ID';
    return t.biometric?.unlockBiometrics || 'Biometrics';
  }, [biometryType, t.biometric]);

  const handleAuth = useCallback(async () => {
    if (promptInFlightRef.current) return;
    if (AppState.currentState !== 'active') {
      setAuthError(t.biometric?.authFailed || 'Biometric authentication failed. Please try again.');
      return;
    }

    setAuthError('');
    promptInFlightRef.current = true;

    try {
      const { available } = await rnBiometrics.isSensorAvailable();
      if (!available) {
        setAuthError(t.biometric?.authFailed || 'Biometric authentication failed. Please try again.');
        return;
      }

      const label = getBiometryLabel();
      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: (t.biometric?.verifyPrompt || 'Verify with {{label}} to continue').replace('{{label}}', label),
        cancelButtonText: t.common?.cancel || 'Cancel',
        fallbackPromptMessage: t.biometric?.verifyToContinue || 'Verify your identity to continue',
      });

      if (success) {
        setLocked(false);
      } else {
        setAuthError(t.biometric?.authCancelled || 'Authentication cancelled. Try again or logout.');
      }
    } catch {
      setAuthError(t.biometric?.authFailed || 'Biometric authentication failed. Please try again.');
    } finally {
      promptInFlightRef.current = false;
    }
  }, [getBiometryLabel, t.biometric]);

  const handleLogoutInstead = useCallback(async () => {
    setLocked(false);
    await fullLogout();
    DeviceEventEmitter.emit('auth:sessionExpired');
  }, []);

  useEffect(() => {
    if (autoPromptTaskRef.current) {
      autoPromptTaskRef.current.cancel?.();
      autoPromptTaskRef.current = null;
    }

    if (!locked || !sensorReady) return;

    autoPromptTaskRef.current = InteractionManager.runAfterInteractions(() => {
      const timer = setTimeout(() => {
        if (AppState.currentState === 'active') {
          handleAuth();
        }
      }, 600);
      autoPromptTaskRef.current = { cancel: () => clearTimeout(timer) };
    });

    return () => {
      if (autoPromptTaskRef.current?.cancel) {
        autoPromptTaskRef.current.cancel();
      }
      autoPromptTaskRef.current = null;
    };
  }, [locked, sensorReady, handleAuth]);

  if (!locked || !isAuthenticated || !biometricsEnabled) return null;

  const biometricLabel =
    biometryType === 'FaceID' ? (t.biometric?.unlockFaceId || 'Unlock with Face ID') :
    biometryType === 'TouchID' ? (t.biometric?.unlockTouchId || 'Unlock with Touch ID') :
    (t.biometric?.unlockBiometrics || 'Unlock with Biometrics');

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Image source={ICONS.lock} style={styles.lockIcon} resizeMode="contain" />
          <AppText variant="h1" align="center" style={styles.title}>
            {t.biometric?.appLocked || 'App Locked'}
          </AppText>
          <AppText variant="body" color={COLORS.gray600} align="center" style={styles.subtitle}>
            {t.biometric?.verifyToContinue || 'Verify your identity to continue'}
          </AppText>

          {authError ? (
            <AppText variant="bodySmall" color={COLORS.danger} align="center" style={styles.error}>
              {authError}
            </AppText>
          ) : null}

          <AppButton
            title={sensorReady ? biometricLabel : (t.biometric?.unavailable || 'Biometrics unavailable')}
            onPress={handleAuth}
            disabled={!sensorReady}
            style={styles.primaryBtn}
            accessibilityLabel={biometricLabel}
          />

          <AppButton
            title={t.biometric?.logoutInstead || 'Logout Instead'}
            variant="ghost"
            onPress={handleLogoutInstead}
            style={styles.secondaryBtn}
            accessibilityLabel={t.biometric?.logoutInstead || 'Logout Instead'}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  lockIcon: { width: 72, height: 72, marginBottom: 24, tintColor: COLORS.primary },
  title: { marginBottom: 10 },
  subtitle: { marginBottom: 40, lineHeight: 23 },
  error: { marginBottom: 20 },
  primaryBtn: { width: '100%', marginBottom: 14 },
  secondaryBtn: { width: '100%' },
});

export default BiometricLockModal;
