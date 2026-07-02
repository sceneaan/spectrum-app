import React, { useEffect, useRef } from 'react';
import { Alert, AppState, InteractionManager } from 'react-native';
import ReactNativeBiometrics from 'react-native-biometrics';
import { useAuthStore } from '../store/authStore';
import { useLanguage } from '../store/LanguageContext';

/**
 * Shows the one-time Face ID / Touch ID opt-in after login navigation settles.
 * Avoids racing OTP navigation with a system alert.
 */
const BiometricEnrollmentPrompt = () => {
  const {
    isAuthenticated,
    biometricsEnabled,
    pendingBiometricOffer,
    setPendingBiometricOffer,
    setBiometricsEnabled,
  } = useAuthStore();
  const { t } = useLanguage();
  const promptInFlightRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || biometricsEnabled || !pendingBiometricOffer || promptInFlightRef.current) {
      return undefined;
    }

    let cancelled = false;
    let clearTimer = null;

    const interactionTask = InteractionManager.runAfterInteractions(() => {
      clearTimer = setTimeout(async () => {
        if (cancelled || promptInFlightRef.current || AppState.currentState !== 'active') return;
        if (!useAuthStore.getState().pendingBiometricOffer || useAuthStore.getState().biometricsEnabled) {
          return;
        }

        promptInFlightRef.current = true;
        setPendingBiometricOffer(false);

        try {
          const rnBiometrics = new ReactNativeBiometrics();
          const { available, biometryType } = await rnBiometrics.isSensorAvailable();
          if (cancelled || !available || !biometryType) return;

          const label = biometryType === 'FaceID'
            ? (t.biometric?.faceId || 'Face ID')
            : biometryType === 'TouchID'
              ? (t.biometric?.touchId || 'Touch ID')
              : (t.biometric?.biometrics || 'Biometrics');

          Alert.alert(
            (t.biometric?.enablePromptTitle || 'Enable {{label}}?').replace('{{label}}', label),
            (t.biometric?.enablePromptMessage || 'Lock the app with {{label}} for added privacy. You can turn this off anytime in Profile.').replace('{{label}}', label),
            [
              { text: t.biometric?.notNow || 'Not Now', style: 'cancel' },
              {
                text: t.biometric?.enable || 'Enable',
                onPress: async () => {
                  try {
                    const { success } = await rnBiometrics.simplePrompt({
                      promptMessage: (t.biometric?.verifyPrompt || 'Verify with {{label}} to continue').replace('{{label}}', label),
                      cancelButtonText: t.common?.cancel || 'Cancel',
                      fallbackPromptMessage: t.biometric?.verifyToContinue || 'Verify your identity to continue',
                    });
                    if (success) setBiometricsEnabled(true);
                  } catch {
                    // Keep biometrics off if verification fails
                  }
                },
              },
            ],
          );
        } catch {
          // Sensor unavailable — skip silently
        } finally {
          promptInFlightRef.current = false;
        }
      }, 900);
    });

    return () => {
      cancelled = true;
      interactionTask.cancel?.();
      if (clearTimer) clearTimeout(clearTimer);
    };
  }, [
    isAuthenticated,
    biometricsEnabled,
    pendingBiometricOffer,
    setPendingBiometricOffer,
    setBiometricsEnabled,
    t.biometric,
    t.common,
  ]);

  return null;
};

export default BiometricEnrollmentPrompt;
