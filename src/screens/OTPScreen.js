import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, Image, StyleSheet, KeyboardAvoidingView, Platform, Alert, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppTranslation } from '../hooks/useAppTranslation';
import { AppButton, AppCard, AppText } from '../components/ui';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import { SPACING, RADIUS } from '../theme';
import { useVerifyOtp, useResendOtp } from '../api/services/Auth.Service'; // Import auth service hooks
import { useCreateAppointment } from '../api/services/Appointment.Service';
import { useAuthStore } from '../store/authStore'; // Import auth store
import moment from 'moment-timezone';
import haptics from '../utils/haptics';
import ReactNativeBiometrics from 'react-native-biometrics';

const OTPScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t, lang, isRTL } = useAppTranslation();
  const { emailOrPhone, targetScreen, targetParams } = route.params || {};

  const { setAuth, biometricsEnabled, setBiometricsEnabled } = useAuthStore();

  const [otp, setOtp] = useState(new Array(6).fill(''));
  const [timer, setTimer] = useState(420); // 7 minutes * 60 seconds
  const [error, setError] = useState('');
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef([]); // Ref for OTP input fields

  const { mutate: verifyOtp, isPending: isVerifying } = useVerifyOtp();
  const { mutate: resendOtp, isPending: isResending } = useResendOtp();
  const { mutateAsync: createAppointment, isPending: isCreatingAppointment } = useCreateAppointment();

  // Verify OTP function - defined early for use in handleOtpChange
  const handleVerify = useCallback(() => {
    // Filter out empty strings and join to get actual entered digits
    const filledDigits = otp.filter(d => d !== '');
    const enteredOtp = filledDigits.join('');

    if (filledDigits.length !== 6 || enteredOtp.length !== 6) {
      setError(t('auth.otp.invalidOtpLength') || 'Please enter the full 6-digit OTP.');
      return;
    }
    setError('');

    verifyOtp({ otp: enteredOtp, emailOrPhone }, {
      onSuccess: async (response) => {
        // Providers may use the app; video sessions remain patient-only (see videoAccess guards).
        // Note: Response object IS the user object (not nested under response.user)
        setAuth({
          user: response,
          token: response.token,
          refreshToken: response.refreshToken,
          expiresIn: response.expiresIn,
        });
        haptics.success();

        // Offer biometric lock to first-time users on devices that support it
        if (!biometricsEnabled) {
          (async () => {
            try {
              const rnBiometrics = new ReactNativeBiometrics();
              const { biometryType } = await rnBiometrics.isSensorAvailable();
              if (biometryType) {
                const label = biometryType === 'FaceID' ? 'Face ID' :
                              biometryType === 'TouchID' ? 'Touch ID' : 'Biometrics';
                setTimeout(() => {
                  Alert.alert(
                    `Enable ${label}?`,
                    `Lock the app with ${label} for added privacy. You can disable this in settings.`,
                    [
                      { text: 'Not Now', style: 'cancel' },
                      { text: 'Enable', onPress: () => setBiometricsEnabled(true) },
                    ],
                  );
                }, 900);
              }
            } catch {}
          })();
        }

        // Only brand-new patients with an incomplete profile need the
        // Consent → PatientInfo/Signature flow. Existing/active users — and admins —
        // must skip it. Previously this only checked signatureUrl, so EVERY returning
        // user without a saved signature (most existing users, regardless of role)
        // was wrongly forced back through Consent. Mirror the web VerifyCode guard.
        const loggedInRole = response?.role?.toLowerCase();
        const needsConsent =
          loggedInRole === 'patient' &&
          response?.status !== 'active' &&
          !response?.signatureUrl &&
          !response?.fullName &&
          !response?.nationality &&
          !response?.nationalId &&
          !response?.dob;

        if (needsConsent) {
          navigation.navigate('Consent', { targetScreen, targetParams, emailOrPhone });
        } else {
          // Returning user (already has signature)
          // Check if we're coming from a booking flow (DoctorProfile with booking data)
          const isBookingFlow = targetScreen === 'DoctorProfile' &&
                                targetParams?.doctor &&
                                targetParams?.preSelectedTime;

          if (isBookingFlow) {
            // Create appointment automatically for returning user
            try {
              const doctor = targetParams.doctor;
              const bookingPayload = {
                patientName: response?.fullName,
                providerName: doctor?.fullName,
                date: targetParams.preSelectedTime?.date || targetParams.preSelectedDate,
                startTime: targetParams.preSelectedTime?.startTime,
                endTime: targetParams.preSelectedTime?.endTime,
                provider: doctor?.id,
                patient: response?.id,
                reason: targetParams.preSelectedReason || '',
                providerService: doctor?.providerService,
                currentTime: moment().locale('en').format('YYYY-MM-DD HH:mm:ss'),
                clientTz: moment.tz.guess(),
              };

              const newAppointment = await createAppointment(bookingPayload);

              if (newAppointment && (newAppointment.id || newAppointment._id)) {
                // Navigate directly to Checkout with appointment ID
                navigation.reset({
                  index: 0,
                  routes: [
                    { name: 'Main' },
                    { name: 'Checkout', params: { id: newAppointment.id || newAppointment._id } }
                  ],
                });
              } else {
                throw new Error('Failed to create appointment');
              }
            } catch (appointmentErr) {
              Alert.alert(
                t('common.error') || 'Error',
                appointmentErr?.response?.data?.message || appointmentErr?.message || 'Failed to create appointment. Please try booking again.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Navigate back to DoctorProfile to retry
                      navigation.reset({
                        index: 0,
                        routes: [
                          { name: 'Main' },
                          { name: 'DoctorProfile', params: { doctor: targetParams.doctor } }
                        ],
                      });
                    }
                  }
                ]
              );
            }
          } else {
            // Normal flow - not a booking scenario
            if (targetScreen) {
              // If targetScreen is a tab name, navigate to Main with that tab active
              const tabNames = ['HomeTab', 'SearchTab', 'AppointmentsTab', 'InboxTab'];
              if (tabNames.includes(targetScreen)) {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Main', state: { routes: [{ name: targetScreen, params: targetParams }] } }],
                });
              } else {
                navigation.replace(targetScreen, targetParams);
              }
            } else {
              // Default navigation after login if no targetScreen was set
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              });
            }
          }
        }
      },
      onError: (err) => {
        // Handle rate limit error (429)
        if (err.isRateLimited || err.message === 'RATE_LIMIT_EXCEEDED') {
          Alert.alert(
            t('auth.otp.tooManyAttempts') || "Too Many Attempts",
            t('auth.otp.rateLimitMessage') || "You have made too many verification attempts. Please wait a few minutes before trying again.",
            [{ text: t('common.ok') || "OK" }]
          );
          setError(t('auth.otp.pleaseWaitAndRetry') || "Please wait a few minutes and try again.");
          return;
        }

        haptics.error();
        const errorMessage = err.response?.data?.message || err.message || t('auth.otp.verificationFailed') || "OTP verification failed.";
        setError(errorMessage);
      }
    });
  }, [otp, emailOrPhone, verifyOtp, t, navigation, targetScreen, targetParams, setAuth, createAppointment]);

  // Auto-submit when all 6 digits are filled (covers paste and SMS auto-fill)
  useEffect(() => {
    const allFilled = otp.every(d => d !== '') && otp.join('').length === 6;
    if (allFilled && !isVerifying && !isCreatingAppointment) {
      handleVerify();
    }
  }, [otp]);

  // Timer useEffect
  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    } else {
      setCanResend(true);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Handle OTP input changes
  const handleOtpChange = (text, index) => {
    // Clean the input - remove non-digits
    const cleanText = text.replace(/\D/g, '');

    // Handle paste or SMS auto-fill (multi-character input)
    if (cleanText.length > 1) {
      const digits = cleanText.slice(0, 6); // Limit to 6 digits
      const newOtp = new Array(6).fill('');

      // Fill the OTP array with the pasted/auto-filled digits
      for (let i = 0; i < digits.length && i < 6; i++) {
        newOtp[i] = digits[i];
      }

      setOtp(newOtp);

      // Focus on the next empty box or the last box if all are filled
      const nextIndex = Math.min(digits.length, 5);
      if (inputRefs.current[nextIndex]) {
        inputRefs.current[nextIndex].focus();
      }

      // If all 6 digits are filled, dismiss keyboard
      if (digits.length === 6) {
        Keyboard.dismiss();
      }
      setError('');
      return;
    }

    // Handle single character input
    const newOtp = [...otp];
    newOtp[index] = cleanText.slice(0, 1); // Take only the first digit
    setOtp(newOtp);

    // Move focus to next input if a digit was entered
    if (cleanText && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }

    // Count filled digits (non-empty strings)
    const filledDigits = newOtp.filter(d => d !== '').length;

    // Dismiss keyboard if all digits are entered
    if (filledDigits === 6) {
      Keyboard.dismiss();
    }
    setError(''); // Clear error on input
  };

  // Handle backspace key
  const handleKeyPress = ({ nativeEvent: { key: pressedKey } }, index) => {
    if (pressedKey === 'Backspace' && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1].focus();
    }
  };


  const handleResend = () => {
    if (!canResend) return;

    setTimer(420);
    setCanResend(false);
    setError(''); // Clear any existing errors

    const payload = {
      emailOrPhone: emailOrPhone,
      preferredLanguage: lang || 'en',
    };

    resendOtp(payload, {
      onSuccess: () => {
        Alert.alert(t('auth.otp.success') || "Success", t('auth.otp.resendSuccess') || "OTP has been re-sent to your device.");
      },
      onError: (err) => {
        const errorMessage = err.response?.data?.message || t('auth.otp.resendFailed') || "Failed to re-send OTP.";
        Alert.alert(t('auth.otp.error') || t('common.error') || 'Error', errorMessage);
        // Reset the ability to resend after error
        setTimer(60); // Give user a shorter timer to try again
      }
    });
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const alignText = isRTL ? 'right' : 'center';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.content}>

          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/images/spectrum_logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <AppText variant="h1" align={alignText} color={COLORS.primary} style={styles.title}>
            {t('auth.otp.enterCode') || 'Enter Verification Code'}
          </AppText>
          <AppText variant="bodySmall" align={alignText} style={styles.subtitle}>
            {t('auth.otp.codeSentTo') || "We've sent a code to"}
            {' '}
            <AppText variant="bodySmall" color={COLORS.primary} style={{ writingDirection: 'ltr' }}>
              {emailOrPhone}
            </AppText>
          </AppText>

          <AppCard style={styles.card}>
            <View style={[styles.otpContainer, { direction: 'ltr', flexDirection: 'row' }]}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(ref) => (inputRefs.current[i] = ref)}
                  style={[
                    styles.otpBox,
                    otp[i] && styles.otpBoxActive,
                    error && styles.otpBoxError,
                    { writingDirection: 'ltr', textAlign: 'center' },
                  ]}
                  keyboardType="number-pad"
                  maxLength={6}
                  onChangeText={(text) => handleOtpChange(text, i)}
                  onKeyPress={(e) => handleKeyPress(e, i)}
                  value={digit}
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  contextMenuHidden={false}
                />
              ))}
            </View>

            {error ? (
              <AppText variant="caption" color={COLORS.danger} align={alignText} style={styles.errorText}>
                {error}
              </AppText>
            ) : null}

            {timer > 0 ? (
              <AppText variant="caption" align={alignText} color={COLORS.primaryDark} style={styles.timer}>
                {t('auth.otp.expiresIn') || 'OTP will expire in'} {formatTime(timer)}
              </AppText>
            ) : (
              <AppText variant="caption" align={alignText} color={COLORS.warning} style={styles.timer}>
                {t('auth.otp.expired') || 'OTP Expired'}
              </AppText>
            )}

            <AppButton
              title={
                isVerifying ? (t('common.verifying') || 'Verifying...')
                  : isCreatingAppointment ? (t('auth.otp.creatingAppointment') || 'Creating appointment...')
                    : (t('auth.otp.verify') || 'Verify')
              }
              onPress={handleVerify}
              disabled={isVerifying || isCreatingAppointment || otp.join('').length !== 6}
              loading={isVerifying || isCreatingAppointment}
            />
          </AppCard>

          <View style={[styles.footer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <AppText variant="bodySmall">{t('auth.otp.didNotReceive') || "Didn't receive code?"}</AppText>
            <TouchableOpacity onPress={handleResend} disabled={isResending || !canResend}>
              <AppText
                variant="bodySmall"
                color={(!canResend || isResending) ? COLORS.gray500 : COLORS.primary}
                style={styles.linkText}
              >
                {isResending ? (t('common.resending') || 'Resending...') : (t('auth.otp.resend') || 'Resend')}
              </AppText>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
              <Image
                source={ICONS.back}
                style={[styles.backIcon, isRTL ? { marginStart: SPACING.sm } : { marginEnd: SPACING.sm }]}
              />
              <AppText variant="bodySmall" color={COLORS.textSecondary}>
                {t('auth.otp.backToLogin') || 'Back to login'}
              </AppText>
            </View>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: {
    flex: 1,
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: { marginBottom: SPACING.xxxl },
  logo: { width: 140, height: 72 },
  title: { marginBottom: SPACING.sm },
  subtitle: { marginBottom: SPACING.xxxl, paddingHorizontal: SPACING.lg },
  card: { width: '100%' },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  otpBox: {
    flex: 1,
    maxWidth: 48,
    height: 52,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surfaceMuted,
  },
  otpBoxActive: {
    borderColor: COLORS.primary,
    color: COLORS.primaryDark,
    backgroundColor: COLORS.primaryLight,
  },
  otpBoxError: { borderColor: COLORS.danger },
  errorText: { marginBottom: SPACING.md },
  timer: { marginBottom: SPACING.xl, fontWeight: '500' },
  footer: {
    marginTop: SPACING.xxxl,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  linkText: { fontWeight: '600' },
  backLink: { marginTop: SPACING.xl },
  backIcon: { width: 14, height: 14, tintColor: COLORS.textSecondary },
});

export default OTPScreen;