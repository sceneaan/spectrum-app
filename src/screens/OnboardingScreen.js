import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../store/LanguageContext';
import COLORS from '../constants/colors';

const { width } = Dimensions.get('window');

const OnboardingScreen = () => {
  const navigation = useNavigation();
  const { t, isRTL } = useLanguage();
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const SLIDES = [
    {
      id: '1',
      emoji: '🔍',
      title: t.onboarding?.slide1Title || 'Find Your Therapist',
      subtitle: t.onboarding?.slide1Subtitle || '',
    },
    {
      id: '2',
      emoji: '📅',
      title: t.onboarding?.slide2Title || 'Book with Ease',
      subtitle: t.onboarding?.slide2Subtitle || '',
    },
    {
      id: '3',
      emoji: '💙',
      title: t.onboarding?.slide3Title || 'Begin Your Journey',
      subtitle: t.onboarding?.slide3Subtitle || '',
    },
  ];

  const alignText = { textAlign: isRTL ? 'right' : 'center' };

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
      <Text style={styles.emoji}>{item.emoji}</Text>
      <Text style={[styles.slideTitle, alignText]}>{item.title}</Text>
      <Text style={[styles.slideSubtitle, alignText]}>{item.subtitle}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={[styles.skipBtn, isRTL && { alignSelf: 'flex-start' }]}
        onPress={handleFinish}
        accessibilityLabel={t.accessibility?.skipOnboarding || 'Skip onboarding'}
      >
        <Text style={styles.skipText}>{t.onboarding?.skip || 'Skip'}</Text>
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
      />

      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => flatListRef.current?.scrollToIndex({ index: i })}>
            <View style={[styles.dot, i === currentIndex && styles.dotActive]} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.btn}
          onPress={isLast ? handleFinish : handleNext}
          accessibilityLabel={isLast ? (t.accessibility?.getStarted || 'Get started') : (t.accessibility?.nextSlide || 'Next slide')}
        >
          <Text style={styles.btnText}>
            {isLast ? (t.onboarding?.getStarted || 'Get Started') : `${t.onboarding?.next || 'Next'} →`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  skipBtn: { alignSelf: 'flex-end', padding: 20 },
  skipText: { color: COLORS.gray600, fontSize: 15, fontWeight: '500' },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emoji: { fontSize: 90, marginBottom: 32, textAlign: 'center' },
  slideTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 16,
    width: '100%',
  },
  slideSubtitle: {
    fontSize: 16,
    color: COLORS.gray600,
    lineHeight: 25,
    width: '100%',
  },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 28 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray300,
    marginHorizontal: 5,
  },
  dotActive: { width: 24, backgroundColor: COLORS.primary },
  footer: { paddingHorizontal: 30, paddingBottom: 20 },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  btnText: { color: COLORS.white, fontSize: 17, fontWeight: 'bold' },
});

export default OnboardingScreen;
