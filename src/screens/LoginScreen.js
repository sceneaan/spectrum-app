import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, KeyboardAvoidingView, Platform, Alert, I18nManager, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import { useSendOtp, useResendOtp } from '../api/services/Auth.Service';
import haptics from '../utils/haptics';

const LoginScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t, i18n } = useTranslation();
  const { targetScreen, targetParams } = route.params || {};
  const isRTL = I18nManager.isRTL || i18n.language === 'ar';

  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const { mutate: sendOtp, isPending: isSending } = useSendOtp();
  const { mutate: resendOtp, isPending: isResending } = useResendOtp();

  const isLoading = isSending || isResending;

  const validateInput = (value) => {
    // Basic validation for phone or email (matching backend validation)
    const saudiPhoneRegex = /^(\+?966)[1-9][0-9]{8}$/; // Saudi phone: +966 or 966 followed by 9 digits (first digit 1-9)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!value.trim()) {
      return t('auth.otp.fieldMustBeFilled') || "Input is required";
    }
    // Strip spaces from phone numbers before validating
    const cleanedValue = value.replace(/\s/g, '');
    if (!saudiPhoneRegex.test(cleanedValue) && !emailRegex.test(value.trim())) {
      return t('auth.otp.invalidEmailOrPhoneFormat') || "Invalid email or phone format (Saudi phone: +9665XXXXXXXX)";
    }
    return '';
  };

  const handleContinue = () => {
    haptics.light();
    const validationError = validateInput(input);
    if (validationError) {
      haptics.error();
      setError(validationError);
      return;
    }
    setError('');

    // Normalize phone numbers by stripping spaces for consistent +966XXXXXXXXX format
    const normalizedInput = input.includes('@') ? input.trim() : input.replace(/\s/g, '');

    const payload = {
        emailOrPhone: normalizedInput,
        preferredLanguage: i18n.language || 'en'
    };

    sendOtp(payload, {
        onSuccess: (response) => {
          // Navigate to OTPScreen with the input credential and any target params
          navigation.navigate('OTPScreen', {
             emailOrPhone: normalizedInput,
             targetScreen,
             targetParams
          });
        },
        onError: (err) => {
          const errorMessage = err.response?.data?.message || err.message || t('auth.otp.error') || "Failed to send OTP";

          // Check if error is "isNotVerified" - user exists but not verified yet
          if (errorMessage === 'auth.isNotVerified' || errorMessage === 'isNotVerified' || errorMessage.includes('not verified')) {
            // Use ResendOtp endpoint for unverified users
            const resendPayload = { emailOrPhone: normalizedInput };
            resendOtp(resendPayload, {
              onSuccess: () => {
                navigation.navigate('OTPScreen', {
                  emailOrPhone: normalizedInput,
                  targetScreen,
                  targetParams
                });
              },
              onError: (resendErr) => {
                const resendErrorMsg = resendErr.response?.data?.message || resendErr.message || "Failed to resend OTP";
                Alert.alert(t('alerts.error') || "Error", resendErrorMsg);
              }
            });
          } else {
            // Show error for other cases
            Alert.alert(t('alerts.error') || "Error", errorMessage);
          }
        }
    });
  };

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        {/* Header Back Button */}
        <TouchableOpacity style={styles.backBtn} onPress={handleGoBack}>
          <Image source={ICONS.back} style={styles.backIcon} />
        </TouchableOpacity>

        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/images/spectrum_logo.png')} 
              style={styles.logo} 
              resizeMode="contain" 
            />
          </View>

          {/* Texts */}
          <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('auth.login.welcome') || "Welcome Back"}
          </Text>
          <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('auth.login.signInMessage') || "Sign in to continue to Spectrum"}
          </Text>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('auth.login.emailOrPhoneLabel') || "Email or Phone Number*"}
            </Text>

            <View style={[styles.inputContainer, error ? { borderColor: 'red' } : {}]}>
              <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png' }} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { textAlign: 'left', writingDirection: 'ltr' }]}
                placeholder={t('auth.login.phonePlaceholder') || "Enter phone +9665XXXXXXXX or email"}
                placeholderTextColor={COLORS.gray500}
                value={input}
                onChangeText={(text) => {
                    setInput(text);
                    if(error) setError('');
                }}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            {error ? <Text style={{color: 'red', marginBottom: 10, fontSize: 12, textAlign: isRTL ? 'right' : 'left'}}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.btn, isLoading && { backgroundColor: COLORS.gray500 }]}
              onPress={handleContinue}
              disabled={isLoading}
            >
              <Text style={styles.btnText}>
                  {isLoading ? (t('common.loading') || "Loading...") : (t('auth.login.continue') || "Continue")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={[styles.footer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.footerText}>{t('auth.login.needHelp') || "Need help?"} </Text>
            <TouchableOpacity onPress={() => Linking.openURL('mailto:support@spectrumclinics.care')}>
              <Text style={styles.linkText}>{t('auth.login.contactSupport') || "Contact Support"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  backBtn: { padding: 20 },
  backIcon: { width: 24, height: 24, tintColor: COLORS.gray700 },
  
  content: { flex: 1, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  
  logoContainer: { marginBottom: 30 },
  logo: { width: 150, height: 80 },

  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary, marginBottom: 10 },
  subtitle: { fontSize: 14, color: COLORS.gray600, marginBottom: 40 },

  card: { width: '100%', backgroundColor: COLORS.white, padding: 20, borderRadius: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  label: { fontSize: 14, color: COLORS.gray700, marginBottom: 10 },
  
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.gray300, borderRadius: 8, paddingHorizontal: 15, height: 50, marginBottom: 20 },
  inputIcon: { width: 20, height: 20, tintColor: COLORS.gray800, marginRight: 10 },
  input: { flex: 1, color: COLORS.textPrimary },

  btn: { backgroundColor: COLORS.primary, borderRadius: 8, height: 50, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },

  footer: { flexDirection: 'row', marginTop: 40 },
  footerText: { color: COLORS.gray600 },
  linkText: { color: COLORS.primary, fontWeight: '600' }
});

export default LoginScreen;