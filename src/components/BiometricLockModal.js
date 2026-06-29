import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AppState,
  Modal,
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ReactNativeBiometrics from 'react-native-biometrics';
import { useAuthStore } from '../store/authStore';
import { useLanguage } from '../store/LanguageContext';
import socketService from '../utils/socket';
import COLORS from '../constants/colors';

const rnBiometrics = new ReactNativeBiometrics();
const LOCK_AFTER_MS = 5 * 60 * 1000;

const BiometricLockModal = () => {
  const { isAuthenticated, biometricsEnabled, logout } = useAuthStore();
  const { t } = useLanguage();
  const [locked, setLocked] = useState(false);
  const [biometryType, setBiometryType] = useState(null);
  const [authError, setAuthError] = useState('');
  const appStateRef = useRef(AppState.currentState);
  const backgroundedAtRef = useRef(null);

  useEffect(() => {
    if (!biometricsEnabled) return;
    rnBiometrics.isSensorAvailable().then(({ biometryType: type }) => {
      if (type) setBiometryType(type);
    }).catch(() => {});
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
    setAuthError('');
    try {
      const label = getBiometryLabel();
      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: (t.biometric?.verifyPrompt || 'Verify with {{label}} to continue').replace('{{label}}', label),
        cancelButtonText: t.biometric?.logout || 'Logout',
      });
      if (success) {
        setLocked(false);
      } else {
        setAuthError(t.biometric?.authCancelled || 'Authentication cancelled. Try again or logout.');
      }
    } catch {
      setAuthError(t.biometric?.authFailed || 'Biometric authentication failed. Please try again.');
    }
  }, [getBiometryLabel, t.biometric]);

  const handleLogoutInstead = useCallback(async () => {
    setLocked(false);
    await logout();
    socketService.disconnect();
    DeviceEventEmitter.emit('auth:sessionExpired');
  }, [logout]);

  useEffect(() => {
    if (locked && biometryType) {
      const timer = setTimeout(handleAuth, 400);
      return () => clearTimeout(timer);
    }
  }, [locked, biometryType, handleAuth]);

  if (!locked || !isAuthenticated || !biometricsEnabled) return null;

  const biometricLabel =
    biometryType === 'FaceID' ? `🔒  ${t.biometric?.unlockFaceId || 'Unlock with Face ID'}` :
    biometryType === 'TouchID' ? `👆  ${t.biometric?.unlockTouchId || 'Unlock with Touch ID'}` :
    `🔒  ${t.biometric?.unlockBiometrics || 'Unlock with Biometrics'}`;

  return (
    <Modal visible animationType="fade" statusBarTranslucent>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.lockIcon}>🔐</Text>
          <Text style={styles.title}>{t.biometric?.appLocked || 'App Locked'}</Text>
          <Text style={styles.subtitle}>{t.biometric?.verifyToContinue || 'Verify your identity to continue'}</Text>

          {authError ? <Text style={styles.error}>{authError}</Text> : null}

          <TouchableOpacity style={styles.primaryBtn} onPress={handleAuth} accessibilityRole="button">
            <Text style={styles.primaryBtnText}>{biometricLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={handleLogoutInstead} accessibilityRole="button">
            <Text style={styles.secondaryBtnText}>{t.biometric?.logoutInstead || 'Logout Instead'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  lockIcon: { fontSize: 80, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 10 },
  subtitle: { fontSize: 16, color: COLORS.gray600, textAlign: 'center', marginBottom: 40, lineHeight: 23 },
  error: { color: '#EF4444', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryBtnText: { color: COLORS.white, fontSize: 17, fontWeight: 'bold' },
  secondaryBtn: { paddingVertical: 12 },
  secondaryBtnText: { color: COLORS.gray600, fontSize: 15, textDecorationLine: 'underline' },
});

export default BiometricLockModal;
