import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useAppTranslation } from '../hooks/useAppTranslation';
import LottieView from 'lottie-react-native';
import InAppReview from 'react-native-in-app-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment-timezone';
import COLORS from '../constants/colors';
import haptics from '../utils/haptics';

const APPOINTMENT_COUNT_KEY = '@spectrum_appointment_count';

const triggerAppReviewIfEligible = async () => {
  try {
    const raw = await AsyncStorage.getItem(APPOINTMENT_COUNT_KEY);
    const count = parseInt(raw || '0', 10) + 1;
    await AsyncStorage.setItem(APPOINTMENT_COUNT_KEY, String(count));
    // Request review at 3rd, 10th, 25th successful appointment
    if ((count === 3 || count === 10 || count === 25) && InAppReview.isAvailable()) {
      await InAppReview.RequestInAppReview();
    }
  } catch {}
};

const PaymentSuccessScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const queryClient = useQueryClient();
  const { t } = useAppTranslation();
  const { appointment, paymentType, transactionId } = route.params || {};
  const lottieRef = useRef(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const isAppointment = paymentType === 'appointment' || appointment;
  const isSupportCard = paymentType === 'support_card';

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['myWallet'] });
    queryClient.invalidateQueries({ queryKey: ['upcomingAppointments'] });
    queryClient.invalidateQueries({ queryKey: ['pendingAppointmentsGroupedByDoctor'] });

    haptics.success();

    // Fade in content after a short delay (lets Lottie play first)
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 600);

    // Trigger app review for appointment bookings
    if (isAppointment) {
      triggerAppReviewIfEligible();
    }

    return () => clearTimeout(timer);
  }, [queryClient]);

  const handleGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  const getSuccessContent = () => {
    if (isSupportCard) {
      return {
        title: t('paymentSuccess.supportCardHeading'),
        subtitle: t('paymentSuccess.supportCardSubheading'),
      };
    }
    return {
      title: t('paymentSuccess.heading1'),
      subtitle: t('paymentSuccess.subheading'),
    };
  };

  const { title, subtitle } = getSuccessContent();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Lottie success animation */}
        <LottieView
          ref={lottieRef}
          source={require('../assets/animations/payment-success.json')}
          autoPlay
          loop={false}
          style={styles.lottie}
        />

        {/* Animated content fades in after animation starts */}
        <Animated.Text style={[styles.title, { opacity: fadeAnim }]}>
          {title}
        </Animated.Text>

        <Animated.Text style={[styles.subtitle, { opacity: fadeAnim }]}>
          {subtitle}
        </Animated.Text>

        {isAppointment && appointment && (
          <Animated.View style={[styles.detailsCard, { opacity: fadeAnim }]}>
            <Text style={styles.label}>{t('paymentSuccess.appointmentId')}</Text>
            <Text style={styles.value}>{appointment._id || appointment.id}</Text>

            {appointment.startTime && (
              <>
                <Text style={styles.label}>{t('paymentSuccess.dateAndTime')}</Text>
                <Text style={styles.value}>
                  {moment.utc(appointment.startTime).locale('en').format('MMM D, YYYY')}
                  {' • '}
                  {moment(appointment.startTime).locale('en').format('h:mm A')}
                </Text>
              </>
            )}
          </Animated.View>
        )}

        {transactionId && (
          <Animated.View style={[styles.detailsCard, { opacity: fadeAnim }]}>
            <Text style={styles.label}>{t('paymentSuccess.id')}</Text>
            <Text style={styles.value}>{transactionId}</Text>
          </Animated.View>
        )}

        <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
          <TouchableOpacity style={styles.btn} onPress={handleGoHome}>
            <Text style={styles.btnText}>{t('paymentSuccess.goToHome')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  lottie: {
    width: 180,
    height: 180,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary || COLORS.gray600,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
    lineHeight: 24,
  },
  detailsCard: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 12,
    width: '100%',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  label: {
    fontSize: 14,
    color: COLORS.gray600,
    marginTop: 10,
  },
  value: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  btn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  btnText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PaymentSuccessScreen;
