import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../store/LanguageContext';
import { AppButton, AppText } from '../components/ui';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';

const SupportCardSuccessScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkmarkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(checkmarkAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [scaleAnim, fadeAnim, checkmarkAnim]);

  const handleDone = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.iconContainer,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Animated.View
            style={{
              opacity: checkmarkAnim,
              transform: [
                {
                  scale: checkmarkAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 1.2, 1],
                  }),
                },
              ],
            }}
          >
            <Image source={ICONS.gift} style={styles.giftIcon} resizeMode="contain" />
          </Animated.View>

          <Animated.View
            style={[
              styles.checkmarkBadge,
              {
                opacity: checkmarkAnim,
                transform: [
                  {
                    scale: checkmarkAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, 1.3, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Image source={ICONS.check} style={styles.checkmarkIcon} resizeMode="contain" />
          </Animated.View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', width: '100%' }}>
          <AppText variant="h2" align="center" style={styles.title}>
            {t.supportCard?.successTitle || 'Payment Successful!'}
          </AppText>
          <AppText variant="body" align="center" color={COLORS.textSecondary} style={styles.subtitle}>
            {t.supportCard?.successMessage || 'The support card has been sent to the recipient via SMS.'}
          </AppText>
          <AppButton
            title={t.supportCard?.done || 'Done'}
            onPress={handleDone}
            size="lg"
            style={styles.button}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '90%',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.promo1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    position: 'relative',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  giftIcon: {
    width: 72,
    height: 72,
    tintColor: COLORS.primary,
  },
  checkmarkBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.background,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  checkmarkIcon: {
    width: 22,
    height: 22,
    tintColor: COLORS.white,
  },
  title: {
    marginBottom: 15,
  },
  subtitle: {
    marginBottom: 40,
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  button: {
    marginTop: 4,
  },
});

export default SupportCardSuccessScreen;
