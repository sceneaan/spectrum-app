import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import FastImage from 'react-native-fast-image';
import Header from '../components/Header';
import { AppText, AppButton, AppCard } from '../components/ui';
import { useLanguage } from '../store/LanguageContext';
import { getPromoLocalizedFields } from '../utils/promotions';
import COLORS from '../constants/colors';
import { SPACING, RADIUS } from '../theme';

const PromoDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { t, isRTL } = useLanguage();
  const promo = route.params?.promo || {};
  const align = isRTL ? 'right' : 'left';
  const home = t.home || {};

  const { title, detailBody } = getPromoLocalizedFields(promo, isRTL);
  const imageUri = isRTL
    ? (promo.imageArabic || promo.imageEnglish || promo.image)
    : (promo.imageEnglish || promo.imageArabic || promo.image);
  const externalUrl = promo.link || promo.url || promo.ctaUrl;

  const ctaFromPromo = isRTL ? promo.ctaLabelAr : promo.ctaLabelEn;
  const primaryLabel = promo.ctaAction === 'search'
    ? (ctaFromPromo || home.bookAppointment || 'Book Appointment')
    : (home.bookAppointment || 'Book Appointment');

  const bookNow = () => {
    navigation.navigate('Main', { screen: 'SearchTab' });
  };

  const onPrimaryPress = () => {
    bookNow();
  };

  const openExternal = async () => {
    if (!externalUrl) return;
    try {
      const supported = await Linking.canOpenURL(externalUrl);
      if (supported) await Linking.openURL(externalUrl);
      else Alert.alert(home.linkError || 'Unable to open link', externalUrl);
    } catch {
      Alert.alert(home.linkError || 'Unable to open link', externalUrl);
    }
  };

  return (
    <View style={styles.container}>
      <Header showBack title={home.promoDetailTitle || 'Offer details'} />
      <ScrollView contentContainerStyle={styles.content}>
        {imageUri ? (
          <AppCard style={styles.imageCard} padding={0}>
            <FastImage
              source={{ uri: imageUri, priority: FastImage.priority.normal }}
              style={styles.image}
              resizeMode={FastImage.resizeMode.cover}
            />
          </AppCard>
        ) : null}
        <AppCard padding={SPACING.lg}>
          <AppText variant="h2" align={align}>{title}</AppText>
          {detailBody ? (
            <AppText variant="bodySmall" color={COLORS.textSecondary} style={styles.body} align={align}>
              {detailBody}
            </AppText>
          ) : null}
        </AppCard>
        <View style={styles.actions}>
          <AppButton
            title={primaryLabel}
            onPress={onPrimaryPress}
            style={styles.btn}
          />
          {externalUrl ? (
            <AppButton
              title={home.openPromoLink || 'Learn more'}
              variant="outline"
              onPress={openExternal}
              style={styles.btn}
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  imageCard: { overflow: 'hidden', marginBottom: SPACING.lg, borderRadius: RADIUS.lg },
  image: { width: '100%', height: 180 },
  body: { marginTop: SPACING.md, lineHeight: 22 },
  actions: { marginTop: SPACING.lg, gap: SPACING.sm },
  btn: { width: '100%' },
});

export default PromoDetailScreen;
