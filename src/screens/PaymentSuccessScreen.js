import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import moment from 'moment-timezone';
import COLORS from '../constants/colors';

const PaymentSuccessScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const queryClient = useQueryClient();
  const { appointment, paymentType, transactionId } = route.params || {};

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkmarkAnim = useRef(new Animated.Value(0)).current;

  // Determine success message based on payment type
  const isAppointment = paymentType === 'appointment' || appointment;
  const isSupportCard = paymentType === 'support_card';

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['myWallet'] });
    queryClient.invalidateQueries({ queryKey: ['upcomingAppointments'] });
    queryClient.invalidateQueries({ queryKey: ['pendingAppointmentsGroupedByDoctor'] });

    // Animate in sequence: scale up circle, fade in content, then draw checkmark
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
  }, [queryClient]);

  const handleGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  // Dynamic content based on payment type
  const getSuccessContent = () => {
    if (isSupportCard) {
      return {
        title: 'Support Card Purchased!',
        subtitle: 'Your support card has been activated successfully.',
      };
    }
    return {
      title: 'Payment Successful!',
      subtitle: 'Your appointment has been booked successfully.',
    };
  };

  const { title, subtitle } = getSuccessContent();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Animated Success Icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Icon based on payment type */}
          <Animated.Text
            style={[
              styles.mainIcon,
              {
                opacity: checkmarkAnim,
                transform: [
                  {
                    scale: checkmarkAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, 1.2, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            {isAppointment ? '📅' : '💳'}
          </Animated.Text>

          {/* Success Checkmark Badge */}
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
            <Text style={styles.checkmark}>✓</Text>
          </Animated.View>
        </Animated.View>

        {/* Animated Title */}
        <Animated.Text style={[styles.title, { opacity: fadeAnim }]}>
          {title}
        </Animated.Text>

        {/* Animated Subtitle */}
        <Animated.Text style={[styles.subtitle, { opacity: fadeAnim }]}>
          {subtitle}
        </Animated.Text>

        {/* Show appointment details if it's an appointment */}
        {isAppointment && appointment && (
          <Animated.View style={[styles.detailsCard, { opacity: fadeAnim }]}>
            <Text style={styles.label}>Appointment ID:</Text>
            <Text style={styles.value}>{appointment._id || appointment.id}</Text>

            {appointment.startTime && (
              <>
                <Text style={styles.label}>Date & Time:</Text>
                <Text style={styles.value}>
                  {moment.utc(appointment.startTime).locale('en').format('MMM D, YYYY')} • {moment(appointment.startTime).locale('en').format('h:mm A')}
                </Text>
              </>
            )}
          </Animated.View>
        )}

        {/* Show transaction ID if available */}
        {transactionId && (
          <Animated.View style={[styles.detailsCard, { opacity: fadeAnim }]}>
            <Text style={styles.label}>Transaction ID:</Text>
            <Text style={styles.value}>{transactionId}</Text>
          </Animated.View>
        )}

        {/* Animated Button */}
        <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
          <TouchableOpacity style={styles.btn} onPress={handleGoHome}>
            <Text style={styles.btnText}>Go to Home</Text>
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
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.promo1 || `${COLORS.primary}15`,
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
  mainIcon: {
    fontSize: 70,
  },
  checkmarkBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.success || '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.background || COLORS.white,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  checkmark: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: -2,
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