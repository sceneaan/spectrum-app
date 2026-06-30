import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppTranslation } from '../hooks/useAppTranslation';
import { AppButton, AppCard, AppText, TrustBadge } from '../components/ui';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import { useSendOtp, useResendOtp } from '../api/services/Auth.Service';
import { SPACING, RADIUS } from '../theme';
import haptics from '../utils/haptics';
import {
  normalizeSaudiPhone,
  validateLoginEmail,
  validateLoginPhone,
} from '../utils/loginValidation';

const LOGIN_TABS = [
  { key: 'email', labelKey: 'auth.login.email' },
  { key: 'phone', labelKey: 'auth.login.phone' },
];

const LoginScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t, lang, isRTL } = useAppTranslation();
  const { targetScreen, targetParams } = route.params || {};
  const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
  const alignText = isRTL ? 'right' : 'left';

  const [activeTab, setActiveTab] = useState('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const { mutate: sendOtp, isPending: isSending } = useSendOtp();
  const { mutate: resendOtp, isPending: isResending } = useResendOtp();

  const isLoading = isSending || isResending;

  const switchTab = (tab) => {
    setActiveTab(tab);
    setError('');
    if (tab === 'email') {
      setPhone('');
    } else {
      setEmail('');
    }
  };

  const buildIdentifier = () => {
    if (activeTab === 'phone') {
      return normalizeSaudiPhone(phone);
    }
    return email.trim();
  };

  const validateActiveInput = () => {
    if (activeTab === 'phone') {
      return validateLoginPhone(phone, t);
    }
    return validateLoginEmail(email, t);
  };

  const resolveApiMessage = (message) => {
    if (!message) return '';
    const keyMap = {
      'auth.failedToSendOtp': t('auth.otp.sendFailed') || 'Failed to send OTP. Please try again or use email login.',
      'auth.loginFromWeb': t('auth.otp.providersUseWeb') || 'Please sign in from the Spectrum website.',
      'auth.isNotVerified': t('auth.otp.notVerified') || 'Account not verified yet.',
      'auth.profileBlocked': t('auth.otp.profileBlocked') || 'This account is blocked.',
      'auth.accountInactive': t('auth.otp.accountInactive') || 'This account is inactive.',
      'validation.invalidEmailOrPhone': t('auth.login.invalidPhone') || 'Invalid phone number.',
      'validation.userDoesNotExist': t('auth.otp.userNotFound') || 'No account found for this number.',
    };
    return keyMap[message] || message;
  };

  const goToOtp = (identifier) => {
    navigation.navigate('OTPScreen', {
      emailOrPhone: identifier,
      targetScreen,
      targetParams,
    });
  };

  const submitOtp = (identifier) => {
    const payload = {
      emailOrPhone: identifier,
      preferredLanguage: lang || 'en',
    };

    sendOtp(payload, {
      onSuccess: () => {
        goToOtp(identifier);
      },
      onError: (err) => {
        const rawMessage = err.response?.data?.message || err.message || t('auth.otp.error') || 'Failed to send OTP';
        const errorMessage = resolveApiMessage(rawMessage);

        if (rawMessage === 'auth.isNotVerified' || rawMessage === 'isNotVerified' || rawMessage.includes('not verified')) {
          resendOtp({ emailOrPhone: identifier, preferredLanguage: lang || 'en' }, {
            onSuccess: () => {
              goToOtp(identifier);
            },
            onError: (resendErr) => {
              const msg = resolveApiMessage(resendErr.response?.data?.message || resendErr.message || t('auth.otp.error'));
              Alert.alert(t('common.error') || 'Error', msg);
            },
          });
        } else {
          setError(errorMessage);
        }
      },
    });
  };

  const handleContinue = () => {
    haptics.light();
    const validationError = validateActiveInput();
    if (validationError) {
      haptics.error();
      setError(validationError);
      return;
    }

    setError('');
    submitOtp(buildIdentifier());
  };

  const handlePhoneChange = (text) => {
    setPhone(text.replace(/\D/g, '').slice(0, 9));
    if (error) setError('');
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
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleGoBack}
          accessibilityRole="button"
          accessibilityLabel={t('common.goBack') || 'Go back'}
        >
          <Image source={ICONS.back} style={styles.backIcon} />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/images/spectrum_logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <AppText variant="h1" align="center" color={COLORS.primary} style={styles.title}>
            {t('auth.login.welcome') || 'Welcome Back'}
          </AppText>
          <AppText variant="bodySmall" align="center" style={styles.subtitle}>
            {t('auth.login.signInMessage') || 'Sign in to continue to Spectrum'}
          </AppText>

          <View style={[styles.trustRow, rowStyle]}>
            <TrustBadge icon={ICONS.shield} label={t('auth.login.trustSecure') || 'Secure'} isRTL={isRTL} />
            <TrustBadge icon={ICONS.verified} label={t('auth.login.trustLicensed') || 'Licensed'} isRTL={isRTL} />
            <TrustBadge icon={ICONS.lock} label={t('auth.login.trustPrivate') || 'Private'} isRTL={isRTL} />
          </View>

          <AppCard style={styles.card}>
            <View style={styles.tabBar}>
              {LOGIN_TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.tab, isActive && styles.tabActive]}
                    onPress={() => switchTab(tab.key)}
                    activeOpacity={0.85}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={t(tab.labelKey)}
                  >
                    <AppText
                      variant="bodySmall"
                      align="center"
                      color={isActive ? COLORS.primary : COLORS.gray500}
                      style={isActive ? styles.tabLabelActive : styles.tabLabel}
                    >
                      {t(tab.labelKey)}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.inputSection}>
              {activeTab === 'email' ? (
                <>
                  <AppText variant="label" align={alignText} style={styles.fieldLabel}>
                    {t('auth.login.email')}
                  </AppText>
                  <View style={[styles.inputContainer, rowStyle, error ? styles.inputError : null]}>
                    <Image source={ICONS.profile} style={[styles.inputIcon, { marginEnd: SPACING.md }]} />
                    <TextInput
                      style={[styles.input, styles.ltrField]}
                      placeholder={t('auth.login.emailPlaceholder')}
                      placeholderTextColor={COLORS.gray500}
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        if (error) setError('');
                      }}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                      textContentType="emailAddress"
                      accessibilityLabel={t('auth.login.email')}
                    />
                  </View>
                </>
              ) : (
                <>
                  <AppText variant="label" align={alignText} style={styles.fieldLabel}>
                    {t('auth.login.phone')}
                  </AppText>
                  <View
                    style={[styles.inputContainer, styles.phoneRow, styles.ltrField, error ? styles.inputError : null]}
                  >
                    <View style={styles.countryCodeBox}>
                      <Text style={styles.flagEmoji}>🇸🇦</Text>
                      <AppText variant="bodySmall" style={styles.countryCodeText}>+966</AppText>
                    </View>
                    <TextInput
                      style={[styles.input, styles.phoneInput, styles.ltrField]}
                      placeholder={t('auth.login.phonePlaceholder')}
                      placeholderTextColor={COLORS.gray500}
                      value={phone}
                      onChangeText={handlePhoneChange}
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      textContentType="telephoneNumber"
                      maxLength={9}
                      accessibilityLabel={t('auth.login.phone')}
                    />
                  </View>
                </>
              )}
            </View>

            {error ? (
              <AppText variant="caption" color={COLORS.danger} align={alignText} style={styles.errorText}>
                {error}
              </AppText>
            ) : null}

            <AppButton
              title={isLoading ? (t('common.loading') || 'Loading...') : (t('auth.login.continue') || 'Continue')}
              onPress={handleContinue}
              disabled={isLoading}
              loading={isLoading}
              style={{ marginTop: SPACING.sm }}
            />
          </AppCard>

          <View style={[styles.footer, rowStyle]}>
            <AppText variant="bodySmall">{t('auth.login.needHelp') || 'Need help?'}</AppText>
            <TouchableOpacity onPress={() => Linking.openURL('mailto:support@spectrumclinics.care')}>
              <AppText variant="bodySmall" color={COLORS.primary} style={styles.linkText}>
                {t('auth.login.contactSupport') || 'Contact Support'}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  backBtn: { padding: SPACING.xl },
  backIcon: { width: 24, height: 24, tintColor: COLORS.textPrimary },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: SPACING.xxxl,
  },
  logoContainer: { marginBottom: SPACING.xxl },
  logo: { width: 140, height: 72 },
  title: { marginBottom: SPACING.sm },
  subtitle: { marginBottom: SPACING.xl, paddingHorizontal: SPACING.lg },
  trustRow: {
    justifyContent: 'center',
    marginBottom: SPACING.xxl,
    gap: SPACING.xs,
  },
  card: { width: '100%' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.lg,
    padding: SPACING.xs,
    marginBottom: SPACING.lg,
    gap: SPACING.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  tabLabel: { fontWeight: '600' },
  tabLabelActive: { fontWeight: '700' },
  inputSection: {
    minHeight: 96,
  },
  fieldLabel: { marginBottom: SPACING.md },
  inputContainer: {
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    minHeight: 52,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surfaceMuted,
  },
  phoneRow: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  countryCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    borderEndWidth: 1.5,
    borderEndColor: COLORS.border,
    alignSelf: 'stretch',
    backgroundColor: COLORS.surface,
    gap: SPACING.xs,
  },
  flagEmoji: { fontSize: 18 },
  countryCodeText: { fontWeight: '600', color: COLORS.textPrimary },
  inputError: { borderColor: COLORS.danger },
  inputIcon: { width: 22, height: 22, tintColor: COLORS.textSecondary },
  input: {
    flex: 1,
    minWidth: 0,
    color: COLORS.textPrimary,
    fontSize: 16,
    padding: 0,
    margin: 0,
  },
  phoneInput: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
  },
  ltrField: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  errorText: { marginBottom: SPACING.sm },
  footer: {
    marginTop: SPACING.xxxl,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  linkText: { fontWeight: '600' },
});

export default LoginScreen;
