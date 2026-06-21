import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import { useGetPatientConsent } from '../api/services/Policy.Service';

const ConsentScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { t, i18n } = useTranslation();
    const isRTL = i18n.dir() === 'rtl';
    const { targetScreen, targetParams, emailOrPhone } = route.params || {};

    // Determine language for API call
    const apiLanguage = i18n.language === 'ar' || isRTL ? 'arabic' : 'english';

    // Fetch patient consent policy from API
    const { data: policyData, isLoading, isError, error } = useGetPatientConsent({ language: apiLanguage });

    const handleAccept = () => {
       // Pass params forward to PatientInfoScreen (correct route name)
       navigation.navigate('PatientInfoScreen', { targetScreen, targetParams, emailOrPhone });
    };

    // Parse consent content from API (split by newlines or numbered points)
    const consentPoints = useMemo(() => {
        if (!policyData?.content) {
            return [];
        }

        // Parse content: split by numbered patterns like "1. ", "2. " etc., or by double newlines
        const content = policyData.content.trim();

        // Try to split by numbered points first (e.g., "1. ", "2. ", etc.)
        const numberedSplit = content.split(/\n?\d+\.\s+/).filter(point => point.trim().length > 0);

        if (numberedSplit.length > 1) {
            return numberedSplit;
        }

        // Otherwise, split by double newlines or single newlines
        const newlineSplit = content.split(/\n\n+/).filter(point => point.trim().length > 0);

        if (newlineSplit.length > 1) {
            return newlineSplit.map(point => point.replace(/\n/g, ' ').trim());
        }

        // If no clear separation, split by single newlines
        const singleNewlineSplit = content.split(/\n/).filter(point => point.trim().length > 0);

        if (singleNewlineSplit.length > 1) {
            return singleNewlineSplit;
        }

        // Last resort: return as single point
        return [content];
    }, [policyData]);

  // Loading State
    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Image source={ICONS.back} style={[styles.backIcon, isRTL && { transform: [{ scaleX: -1 }] }]} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('consent.title') || "Telemedicine Consent"}</Text>
                    <View style={{width: 24}} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>{t('consent.loading') || "Loading consent form..."}</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Error State
    if (isError || (!isLoading && consentPoints.length === 0)) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Image source={ICONS.back} style={[styles.backIcon, isRTL && { transform: [{ scaleX: -1 }] }]} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('consent.title') || "Telemedicine Consent"}</Text>
                    <View style={{width: 24}} />
                </View>
                <View style={styles.errorContainer}>
                    <Image source={ICONS.error} style={styles.errorIcon} />
                    <Text style={styles.errorTitle}>{t('consent.errorTitle') || "Unable to Load Consent"}</Text>
                    <Text style={styles.errorMessage}>
                        {error?.message || t('consent.errorMessage') || "We couldn't load the consent form. Please check your connection and try again."}
                    </Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
                        <Text style={styles.retryBtnText}>{t('common.goBack') || "Go Back"}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image source={ICONS.back} style={[styles.backIcon, isRTL && { transform: [{ scaleX: -1 }] }]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{policyData?.title || t('consent.title') || "Telemedicine Consent"}</Text>
        <View style={{width: 24}} />
      </View>

      <View style={styles.alertBox}>
        <Text style={[styles.alertText, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t('consent.understandAgreement') || "By agreeing to this consent form, I acknowledge and agree to the following:"}
        </Text>
        {policyData?.version && (
          <Text style={[styles.versionText, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('consent.version') || "Version"}: {policyData.version}
          </Text>
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.card}>
          {consentPoints.map((text, index) => (
            <View key={index} style={[styles.pointRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.pointNumber, { textAlign: isRTL ? 'right' : 'left' }]}>{index + 1} - </Text>
              <Text style={[styles.pointText, { textAlign: isRTL ? 'right' : 'left' }]}>{text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.btn}
          onPress={handleAccept}
        >
          <Text style={styles.btnText}>{t('consent.acceptContinue') || "Accept & Continue"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: COLORS.white },
  backIcon: { width: 24, height: 24, tintColor: COLORS.gray700 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },

  alertBox: { padding: 15, backgroundColor: COLORS.background },
  alertText: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 },
  versionText: { fontSize: 12, color: COLORS.gray500, marginTop: 5 },

  scrollView: { flex: 1, paddingHorizontal: 15 },
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 20 },

  pointRow: { flexDirection: 'row', marginBottom: 15 },
  pointNumber: { fontSize: 14, fontWeight: 'bold', color: COLORS.textPrimary },
  pointText: { fontSize: 14, color: COLORS.gray700, lineHeight: 20, flex: 1 },

  footer: { padding: 20, backgroundColor: COLORS.white, borderTopWidth: 1, borderColor: COLORS.gray200 },
  btn: { backgroundColor: COLORS.primary, borderRadius: 8, height: 50, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },

  // Loading State
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 15, fontSize: 16, color: COLORS.gray600, textAlign: 'center' },

  // Error State
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  errorIcon: { width: 80, height: 80, tintColor: COLORS.error || COLORS.red || '#FF4444', marginBottom: 20 },
  errorTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 10, textAlign: 'center' },
  errorMessage: { fontSize: 14, color: COLORS.gray600, textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  retryBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 30 },
  retryBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});

export default ConsentScreen;