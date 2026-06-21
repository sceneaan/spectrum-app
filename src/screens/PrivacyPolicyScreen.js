import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import { useGetPolicy } from '../api/services/Policy.Service';

const PrivacyPolicyScreen = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const isRTL = i18n.dir() === 'rtl';

  // Determine language for API call
  const apiLanguage = i18n.language === 'ar' || isRTL ? 'arabic' : 'english';

  // Fetch Privacy Policy from API with React Query
  const { data: policyData, isLoading, isError, error } = useGetPolicy({
    title: 'Privacy Policy',
    language: apiLanguage
  });

  const headerPress = () => {
    navigation.goBack();
  };

  const alignText = { textAlign: isRTL ? 'right' : 'left' };

  // Parse content into sections/paragraphs
  const contentSections = useMemo(() => {
    if (!policyData?.content) {
      return [];
    }

    const content = policyData.content.trim();

    // Split by double newlines for paragraphs
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);

    if (paragraphs.length > 1) {
      return paragraphs.map(p => p.replace(/\n/g, ' ').trim());
    }

    // Split by single newlines if no double newlines
    const lines = content.split(/\n/).filter(l => l.trim().length > 0);

    if (lines.length > 1) {
      return lines;
    }

    // Return as single section
    return [content];
  }, [policyData]);

  // Loading State
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <StatusBar backgroundColor={COLORS.white} barStyle={'dark-content'} />
        <Header
          showBack={true}
          onBack={headerPress}
          title={t('privacyPolicy.title') || 'Privacy Policy'}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('privacyPolicy.loading') || 'Loading privacy policy...'}</Text>
        </View>
      </View>
    );
  }

  // Error State
  if (isError || contentSections.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <StatusBar backgroundColor={COLORS.white} barStyle={'dark-content'} />
        <Header
          showBack={true}
          onBack={headerPress}
          title={t('privacyPolicy.title') || 'Privacy Policy'}
        />
        <View style={styles.errorContainer}>
          <Image source={ICONS.error} style={styles.errorIcon} />
          <Text style={styles.errorTitle}>{t('privacyPolicy.errorTitle') || 'Unable to Load Privacy Policy'}</Text>
          <Text style={styles.errorMessage}>
            {error?.message || t('privacyPolicy.errorMessage') || "We couldn't load the privacy policy. Please check your connection and try again."}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.retryBtnText}>{t('common.goBack') || 'Go Back'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar backgroundColor={COLORS.white} barStyle={'dark-content'} />
      <Header
        showBack={true}
        onBack={headerPress}
        title={policyData?.title || t('privacyPolicy.title') || 'Privacy Policy'}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}>
        {policyData?.version && (
          <Text style={[styles.versionText, alignText]}>
            {t('common.version') || 'Version'}: {policyData.version}
          </Text>
        )}
        {contentSections.map((section, index) => (
          <Text key={index} style={[styles.sectionText, alignText, { marginBottom: 15 }]}>
            {section}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 20,
  },
  versionText: {
    fontSize: 12,
    color: COLORS.gray500,
    marginBottom: 15,
  },
  sectionText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 22,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: COLORS.gray600,
    textAlign: 'center',
  },

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  errorIcon: {
    width: 80,
    height: 80,
    tintColor: COLORS.error || COLORS.red || '#FF4444',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 30,
  },
  retryBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PrivacyPolicyScreen;
