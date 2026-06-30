import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import moment from 'moment';
import Header from '../components/Header';
import COLORS from '../constants/colors';
import { useCancelAppointment } from '../api/services/Appointment.Service';
import { invalidateAppointmentCaches } from '../utils/queryInvalidation';
import Icon from 'react-native-vector-icons/FontAwesome6';

const CancelAppointmentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t, isRTL } = useTranslation();
  const queryClient = useQueryClient();

  const { appointment } = route.params || {};

  const { mutate: cancelAppointment, isPending } = useCancelAppointment();

  const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
  const alignText = { textAlign: isRTL ? 'right' : 'left' };

  const handleCancel = () => {
    const appointmentId = appointment?._id || appointment?.id || appointment?.appointmentId;

    if (!appointmentId) {
      Alert.alert(
        t.appointments?.error || 'Error',
        t.appointments?.appointmentNotFound || 'Appointment not found'
      );
      return;
    }

    // Pass current time to backend for refund calculation
    cancelAppointment(
      {
        id: appointmentId,
        payload: {
          currentTime: moment().locale('en').format('YYYY-MM-DD[T]HH:mm:ss'),
        },
      },
      {
        onSuccess: (data) => {
          // Handle refund amount if present
          if (data.refundAmount > 0) {
            Alert.alert(
              t.appointments?.success || 'Success',
              `${data.message || t.appointments?.appointmentCancelled || 'Appointment cancelled successfully.'}\n\n${t.appointments?.refundAmount || 'Refund amount'}: ${data.refundAmount.toFixed(2)} SAR`,
              [
                {
                  text: t.common?.ok || 'OK',
                  onPress: async () => {
                    await invalidateAppointmentCaches(queryClient);
                    navigation.goBack();
                  }
                }
              ]
            );
          } else {
            Alert.alert(
              t.appointments?.success || 'Success',
              data.message || t.appointments?.appointmentCancelled || 'Appointment cancelled successfully.',
              [
                {
                  text: t.common?.ok || 'OK',
                  onPress: async () => {
                    await invalidateAppointmentCaches(queryClient);
                    navigation.goBack();
                  }
                }
              ]
            );
          }
        },
        onError: (error) => {
          Alert.alert(
            t.appointments?.error || 'Error',
            error.message || t.appointments?.cancelFailed || 'Failed to cancel appointment. Please try again.'
          );
        },
      }
    );
  };

  const formattedDate = appointment?.date
    ? moment(appointment.date).locale('en').format('MMM D, YYYY')
    : '';
  const formattedTime = appointment?.startTime
    ? `${moment(appointment.startTime).locale('en').format('h:mm A')} - ${moment(appointment.endTime).locale('en').format('h:mm A')}`
    : '';

  return (
    <View style={styles.container}>
      <Header
        title={t.appointments?.cancelAppointment || 'Cancel Appointment'}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 30 }}>
        {/* Appointment Card */}
        <View style={styles.appointmentCard}>
          <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={[styles.appointmentTitle, alignText]}>
              {appointment?.reason || appointment?.serviceName || 'Consultation'}
            </Text>
            <Text style={[styles.doctorName, alignText]}>
              {appointment?.provider?.fullName || appointment?.providerName || 'Doctor'}
            </Text>
            <View style={[rowStyle, { marginTop: 8, alignItems: 'center' }]}>
              <Icon name="calendar" size={14} color={COLORS.textSecondary} />
              <Text style={[styles.dateTime, { marginHorizontal: 6 }]}>
                {formattedDate} {formattedTime ? `• ${formattedTime}` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Cancellation Policy */}
        <Text style={[styles.sectionTitle, alignText]}>
          {t.appointments?.cancellationPolicy || 'Cancellation Policy'}
        </Text>

        <View style={styles.policyCard}>
          <View style={[rowStyle, styles.policyRow]}>
            <Icon name="circle-info" size={16} color="#555" />
            <Text style={[styles.policyText, alignText, { flex: 1, marginHorizontal: 10 }]}>
              {t.appointments?.policy1 || 'Cancellations are allowed up to 24 hours before the appointment.'}
            </Text>
          </View>

          <View style={[rowStyle, styles.policyRow]}>
            <Icon name="circle-check" size={16} color="#555" />
            <Text style={[styles.policyText, alignText, { flex: 1, marginHorizontal: 10 }]}>
              {t.appointments?.policy2 || 'Full refund if cancelled more than 24 hours in advance.'}
            </Text>
          </View>

          <View style={[rowStyle, styles.policyRow]}>
            <Icon name="circle-half-stroke" size={16} color="#555" />
            <Text style={[styles.policyText, alignText, { flex: 1, marginHorizontal: 10 }]}>
              {t.appointments?.policy3 || '50% refund if cancelled between 2-24 hours before appointment.'}
            </Text>
          </View>

          <View style={[rowStyle, styles.policyRow]}>
            <Icon name="circle-xmark" size={16} color="#555" />
            <Text style={[styles.policyText, alignText, { flex: 1, marginHorizontal: 10 }]}>
              {t.appointments?.policy4 || 'No refund if cancelled less than 2 hours before appointment.'}
            </Text>
          </View>

          <View style={[rowStyle, styles.policyRow]}>
            <Icon name="percent" size={16} color="#555" />
            <Text style={[styles.policyText, alignText, { flex: 1, marginHorizontal: 10, fontWeight: '600' }]}>
              {t.appointments?.policy5 || 'A 4% processing fee is deducted from all refunds.'}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={[styles.cancelButton, isPending && { backgroundColor: COLORS.gray500 }]}
          onPress={handleCancel}
          disabled={isPending}
          activeOpacity={0.8}
        >
          {isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.cancelButtonText}>
              {t.appointments?.confirmCancellation || 'Confirm Cancellation'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.keepButton}
          onPress={() => navigation.goBack()}
          disabled={isPending}
          activeOpacity={0.7}
        >
          <Text style={styles.keepButtonText}>
            {t.appointments?.keepAppointment || 'Keep Appointment'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: 20,
  },

  // Appointment Card
  appointmentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  dateTime: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // Section
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },

  // Policy Card
  policyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  policyRow: {
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  policyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  // Buttons
  cancelButton: {
    backgroundColor: COLORS.danger || '#ef4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: COLORS.danger || '#ef4444',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  keepButton: {
    backgroundColor: COLORS.gray200,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  keepButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CancelAppointmentScreen;
