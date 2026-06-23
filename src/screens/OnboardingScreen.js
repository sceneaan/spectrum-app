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
import COLORS from '../constants/colors';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    emoji: '🔍',
    title: 'Find Your Therapist',
    subtitle:
      'Browse verified mental health professionals and find the right match for your needs.',
  },
  {
    id: '2',
    emoji: '📅',
    title: 'Book with Ease',
    subtitle:
      'Schedule appointments online — choose your time, confirm your booking, and you\'re all set.',
  },
  {
    id: '3',
    emoji: '💙',
    title: 'Begin Your Journey',
    subtitle:
      'Connect through secure video calls and take the first step toward lasting wellbeing.',
  },
];

const OnboardingScreen = () => {
  const navigation = useNavigation();
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

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

  const isLast = currentIndex === SLIDES.length - 1;

  const renderSlide = ({ item }) => (
    <View style={[styles.slide, { width }]}>
      <Text style={styles.emoji}>{item.emoji}</Text>
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.skipBtn} onPress={handleFinish} accessibilityLabel="Skip onboarding">
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
      />

      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.btn}
          onPress={isLast ? handleFinish : handleNext}
          accessibilityLabel={isLast ? 'Get started' : 'Next slide'}
        >
          <Text style={styles.btnText}>{isLast ? 'Get Started' : 'Next →'}</Text>
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
    textAlign: 'center',
    marginBottom: 16,
  },
  slideSubtitle: {
    fontSize: 16,
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: 25,
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
