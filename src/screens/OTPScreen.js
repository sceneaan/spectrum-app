import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, KeyboardAvoidingView, Platform, Alert, Keyboard, I18nManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import { useVerifyOtp, useResendOtp } from '../api/services/Auth.Service'; // Import auth service hooks
import { useCreateAppointment } from '../api/services/Appointment.Service';
import { useAuthStore } from '../store/authStore'; // Import auth store
import moment from 'moment-timezone';

const OTPScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t, i18n } = useTranslation();
  const { emailOrPhone, targetScreen, targetParams } = route.params || {};
  const isRTL = I18nManager.isRTL || i18n.language === 'ar';

  const { setAuth } = useAuthStore();

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

    console.log('🔐 [OTP] Verify called - otp state:', otp);
    console.log('🔐 [OTP] Filled digits:', filledDigits, 'count:', filledDigits.length);
    console.log('🔐 [OTP] Entered OTP string:', enteredOtp, 'length:', enteredOtp.length);

    if (filledDigits.length !== 6 || enteredOtp.length !== 6) {
      console.log('❌ [OTP] Validation failed - not 6 digits');
      setError(t('auth.otp.invalidOtpLength') || 'Please enter the full 6-digit OTP.');
      return;
    }
    setError('');

    verifyOtp({ otp: parseInt(enteredOtp, 10), emailOrPhone }, {
      onSuccess: async (response) => {
        // Block only providers (matching old app logic)
        if (response?.role?.toLowerCase() === 'provider') {
          Alert.alert(
            t('auth.otp.accessDenied') || "Access Denied",
            t('auth.otp.providersUseWeb') || "You are a provider. Please use the web application.",
            [
              {
                text: t('common.ok') || "OK",
                onPress: () => navigation.navigate('LoginScreen')
              }
            ]
          );
          return;
        }

        // Proceed with login for non-providers (patients, etc.)
        // Note: Response object IS the user object (not nested under response.user)
        setAuth({ user: response, token: response.token }); // Save to Zustand store

        // Check if signature is required (matches old app flow: OTP → Consent → PatientInfo/Signature)
        console.log('🔍 Checking user signature status:', {
          hasSignatureUrl: !!response?.signatureUrl,
          signatureUrl: response?.signatureUrl,
          userId: response?.id,
          userRole: response?.role,
          fullResponse: response
        });

        if (!response?.signatureUrl) {
          console.log('➡️ New user detected (no signature) - navigating to Consent screen');
          // New user - Navigate to Consent screen first (matching old app's consent-screen → signature-screen flow)
          navigation.navigate('Consent', { targetScreen, targetParams, emailOrPhone });
        } else {
          console.log('✅ Returning user detected (has signature) - skipping consent');
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
              console.error('Error creating appointment for returning user:', appointmentErr);
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
              const tabNames = ['HomeTab', 'AppointmentsTab', 'ProfileTab', 'SettingsTab'];
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
        console.error("OTP Verification Error:", err);

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

        const errorMessage = err.response?.data?.message || err.message || t('auth.otp.verificationFailed') || "OTP verification failed.";
        setError(errorMessage);
      }
    });
  }, [otp, emailOrPhone, verifyOtp, t, navigation, targetScreen, targetParams, setAuth, createAppointment]);

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
    console.log("📱 Resend OTP clicked - canResend:", canResend, "timer:", timer);

    if (!canResend) {
      console.log("⚠️ Resend blocked - canResend is false or timer not expired");
      return;
    }

    console.log("📤 Attempting to resend OTP to:", emailOrPhone);

    setTimer(420); // Reset timer
    setCanResend(false);
    setError(''); // Clear any existing errors

    const payload = {
      emailOrPhone: emailOrPhone,
      preferredLanguage: i18n.language || 'en' // Use current language preference
    };

    resendOtp(payload, {
      onSuccess: () => {
        Alert.alert(t('auth.otp.success') || "Success", t('auth.otp.resendSuccess') || "OTP has been re-sent to your device.");
      },
      onError: (err) => {
        console.error("❌ OTP Resend Error:", err);
        console.error("Error response:", err.response?.data);
        console.error("Error message:", err.response?.data?.message);
        const errorMessage = err.response?.data?.message || t('auth.otp.resendFailed') || "Failed to re-send OTP.";
        Alert.alert("Error", errorMessage);
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.content}>
          
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/images/spectrum_logo.png')} 
              style={styles.logo} 
              resizeMode="contain" 
            />
          </View>

          <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('auth.otp.enterCode') || "Enter Verification Code"}
          </Text>
          <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('auth.otp.codeSentTo') || "We've sent a code to "}
            <Text style={{color: COLORS.primary, writingDirection: 'ltr'}}>{emailOrPhone}</Text>
          </Text>

          {/* Card */}
          <View style={styles.card}>
            {/* OTP Boxes - Always LTR */}
            <View style={[styles.otpContainer, { direction: 'ltr', flexDirection: 'row' }]}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(ref) => (inputRefs.current[i] = ref)}
                  style={[styles.otpBox, otp[i] && styles.otpBoxActive, error && {borderColor: 'red'}, { writingDirection: 'ltr', textAlign: 'center' }]}
                  keyboardType="number-pad"
                  maxLength={6} // Allow paste of full OTP into any box
                  onChangeText={(text) => handleOtpChange(text, i)}
                  onKeyPress={(e) => handleKeyPress(e, i)}
                  value={digit}
                  // SMS/Email Auto-fill support
                  // iOS: textContentType="oneTimeCode" on ALL boxes
                  textContentType="oneTimeCode"
                  // Android: autoComplete="sms-otp" on ALL boxes
                  autoComplete="sms-otp"
                  // Enable paste context menu
                  contextMenuHidden={false}
                />
              ))}
            </View>

            {error ? <Text style={{color: 'red', marginBottom: 10, fontSize: 12, textAlign: isRTL ? 'right' : 'left'}}>{error}</Text> : null}

            {timer > 0 ? (
                <Text style={[styles.timer, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('auth.otp.expiresIn') || "OTP will expire in"} {formatTime(timer)}
                </Text>
            ) : (
                <Text style={[styles.timer, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('auth.otp.expired') || "OTP Expired"}
                </Text>
            )}

            <TouchableOpacity
              style={[styles.btn, (isVerifying || isCreatingAppointment) && { backgroundColor: COLORS.gray500 }]}
              onPress={handleVerify}
              disabled={isVerifying || isCreatingAppointment || otp.join('').length !== 6}
            >
              <Text style={styles.btnText}>
                  {isVerifying ? (t('common.verifying') || "Verifying...") :
                   isCreatingAppointment ? "Creating appointment..." :
                   (t('auth.otp.verify') || "Verify")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={[styles.footer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.footerText}>{t('auth.otp.didNotReceive') || "Didn't receive code?"} </Text>
            <TouchableOpacity
                onPress={handleResend}
                disabled={isResending || !canResend}
            >
              <Text style={[styles.linkText, (!canResend || isResending) && { color: COLORS.gray500 }]}>
                  {isResending ? (t('common.resending') || "Resending...") : (t('auth.otp.resend') || "Resend")}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={{ marginTop: 20 }} onPress={() => navigation.goBack()}>
             <View style={{flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center'}}>
                <Image source={ICONS.back} style={{width: 14, height: 14, tintColor: COLORS.gray700, marginRight: isRTL ? 0 : 5, marginLeft: isRTL ? 5 : 0}} />
                <Text style={styles.backText}>{t('auth.otp.backToLogin') || "Back to login"}</Text>
             </View>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' },
  
  logoContainer: { marginBottom: 40 },
  logo: { width: 150, height: 80 },

  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary, marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.gray600, marginBottom: 40, textAlign: 'center' },

  card: { width: '100%', backgroundColor: COLORS.white, padding: 25, borderRadius: 16, elevation: 1 },
  
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  otpBox: { width: 45, height: 50, borderWidth: 1, borderColor: COLORS.gray300, borderRadius: 8, fontSize: 18, color: COLORS.textPrimary },
  otpBoxActive: { borderColor: COLORS.primary, color: COLORS.primary },

  timer: { fontSize: 12, color: COLORS.primary, textAlign: 'center', marginBottom: 20 },

  btn: { backgroundColor: COLORS.primary, borderRadius: 8, height: 50, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },

  footer: { flexDirection: 'row', marginTop: 40 },
  footerText: { color: COLORS.gray600 },
  linkText: { color: COLORS.primary, fontWeight: '600' },
  backText: { color: COLORS.gray700, fontSize: 14 }
});

export default OTPScreen;