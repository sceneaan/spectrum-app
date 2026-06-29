import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../store/LanguageContext';
import { AppText, AppButton } from '../components/ui';
import ICONS from '../constants/icons';
import COLORS from '../constants/colors';
import { SPACING, RADIUS, SHADOWS } from '../theme';
import { createScrollToIndexFailedHandler } from '../utils/scrollToIndex';

const { width } = Dimensions.get('window');

const OnboardingScreen = () => {
  const navigation = useNavigation();
  const { t, isRTL } = useLanguage();
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const handleScrollToIndexFailed = useCallback(
    createScrollToIndexFailedHandler(flatListRef, width),
    [],
  );

  const SLIDES = [
    {
      id: '1',
      icon: ICONS.search,
      tint: COLORS.primary,
      title: t.onboarding?.slide1Title || 'Find Your Therapist',
      subtitle: t.onboarding?.slide1Subtitle || '',
    },
    {
      id: '2',
      icon: ICONS.calendar,
      tint: COLORS.secondary,
      title: t.onboarding?.slide2Title || 'Book with Ease',
      subtitle: t.onboarding?.slide2Subtitle || '',
    },
    {
      id: '3',
      icon: ICONS.shield,
      tint: COLORS.primaryDark,
      title: t.onboarding?.slide3Title || 'Begin Your Journey',
      subtitle: t.onboarding?.slide3Subtitle || '',
    },
  ];

  const alignText = isRTL ? 'right' : 'center';

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem('@spectrum_onboarding_done', 'true');
    navigation.replace('Main');
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems?.[0]?.index != null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const isLast = currentIndex === SLIDES.length - 1;

  const renderSlide = ({ item }) => (
    <View style={[styles.slide, { width }]}>
      <View style={styles.decorCircle} />
      <View style={[styles.decorCircleSmall, { backgroundColor: `${item.tint}22` }]} />
      <View style={[styles.iconCircle, { backgroundColor: `${item.tint}18` }]}>
        <Image source={item.icon} style={[styles.slideIcon, { tintColor: item.tint }]} />
      </View>
      <AppText variant="h1" align={alignText} style={styles.slideTitle}>
        {item.title}
      </AppText>
      <AppText variant="body" align={alignText} color={COLORS.textSecondary} style={styles.slideSubtitle}>
        {item.subtitle}
      </AppText>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={[styles.skipBtn, isRTL && { alignSelf: 'flex-start' }]}
        onPress={handleFinish}
        accessibilityLabel={t.accessibility?.skipOnboarding || 'Skip onboarding'}
      >
        <AppText variant="bodyMedium" color={COLORS.textSecondary}>
          {t.onboarding?.skip || 'Skip'}
        </AppText>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        inverted={isRTL}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        onScrollToIndexFailed={handleScrollToIndexFailed}
      />

      <View style={styles.dotsRow}>
        {SLIDES.map((slide, i) => (
          <TouchableOpacity
            key={slide.id}
            onPress={() => flatListRef.current?.scrollToIndex({ index: i })}
          >
            <View style={[styles.dot, i === currentIndex && styles.dotActive]} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <AppButton
          title={isLast ? (t.onboarding?.getStarted || 'Get Started') : (t.onboarding?.next || 'Next')}
          onPress={isLast ? handleFinish : handleNext}
          size="lg"
          variant="primary"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  skipBtn: { alignSelf: 'flex-end', padding: SPACING.xl },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.huge,
    paddingBottom: SPACING.huge,
  },
  decorCircle: {
    position: 'absolute',
    top: 40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.primaryLight,
    opacity: 0.5,
  },
  decorCircleSmall: {
    position: 'absolute',
    bottom: 80,
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xxxl,
    ...SHADOWS.md,
  },
  slideIcon: { width: 44, height: 44 },
  slideTitle: { marginBottom: SPACING.lg, width: '100%' },
  slideSubtitle: { width: '100%', lineHeight: 26 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: SPACING.xxl, gap: SPACING.sm },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray300,
  },
  dotActive: { width: 28, backgroundColor: COLORS.primary },
  footer: { paddingHorizontal: SPACING.xxxl, paddingBottom: SPACING.xl },
});

export default OnboardingScreen;
