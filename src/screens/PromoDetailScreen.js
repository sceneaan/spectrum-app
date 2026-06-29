import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import FastImage from 'react-native-fast-image';
import Header from '../components/Header';
import { AppText, AppButton, AppCard } from '../components/ui';
import { useLanguage } from '../store/LanguageContext';
import COLORS from '../constants/colors';
import { SPACING, RADIUS } from '../theme';

const PromoDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { t, isRTL } = useLanguage();
  const promo = route.params?.promo || {};
  const align = isRTL ? 'right' : 'left';

  const title = isRTL
    ? (promo.titleArabic || promo.titleEnglish || promo.title)
    : (promo.titleEnglish || promo.titleArabic || promo.title);
  const description = isRTL
    ? (promo.descriptionArabic || promo.descriptionEnglish || promo.subtitle || promo.description)
    : (promo.descriptionEnglish || promo.descriptionArabic || promo.subtitle || promo.description);
  const imageUri = isRTL
    ? (promo.imageArabic || promo.imageEnglish || promo.image)
    : (promo.imageEnglish || promo.imageArabic || promo.image);
  const externalUrl = promo.link || promo.url || promo.ctaUrl;

  const openExternal = async () => {
    if (!externalUrl) return;
    try {
      const supported = await Linking.canOpenURL(externalUrl);
      if (supported) await Linking.openURL(externalUrl);
      else Alert.alert(t.home?.linkError || 'Unable to open link', externalUrl);
    } catch {
      Alert.alert(t.home?.linkError || 'Unable to open link', externalUrl);
    }
  };

  const bookNow = () => {
    navigation.navigate('Main', { screen: 'SearchTab' });
  };

  return (
    <View style={styles.container}>
      <Header showBack title={t.home?.promoDetailTitle || 'Promotion'} />
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
          {description ? (
            <AppText variant="bodySmall" color={COLORS.textSecondary} style={styles.body} align={align}>
              {description}
            </AppText>
          ) : null}
        </AppCard>
        <View style={styles.actions}>
          {externalUrl ? (
            <AppButton
              label={t.home?.openPromoLink || 'Learn more'}
              onPress={openExternal}
              style={styles.btn}
            />
          ) : null}
          <AppButton
            label={t.home?.bookAppointment || 'Book Appointment'}
            variant={externalUrl ? 'outline' : 'primary'}
            onPress={bookNow}
            style={styles.btn}
          />
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
