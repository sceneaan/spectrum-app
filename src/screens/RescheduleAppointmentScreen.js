import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useLanguage } from '../store/LanguageContext';
import moment from 'moment';
import Header from '../components/Header';
import COLORS from '../constants/colors';
import { useRescheduleAppointment } from '../api/services/Appointment.Service';
import { useGetSlots } from '../api/services/Availablity.Service';
import Icon from 'react-native-vector-icons/FontAwesome6';

const RescheduleAppointmentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t, isRTL } = useLanguage();
  const { appointment, onRescheduleSuccess } = route.params || {};

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const { mutate: rescheduleAppointment, isPending: isRescheduling } = useRescheduleAppointment();

  // Get provider ID from appointment
  const providerId = appointment?.provider?.id || appointment?.provider?._id || appointment?.providerId;
  const providerName = appointment?.provider?.fullName || appointment?.providerName || 'Doctor';
  const slotDuration = appointment?.slotDuration || 30;

  // Fetch slots for selected date
  const currentTime = moment().locale('en').format('YYYY-MM-DD HH:mm:ss');
  const shouldFetchSlots = !!(selectedDate && providerId);

  const { data: slotsData, isLoading: isLoadingSlots } = useGetSlots(
    providerId,
    {
      date: moment(selectedDate).locale('en').format('YYYY-MM-DD'),
      slotDuration: slotDuration,
      currentTime: currentTime,
    },
    {
      enabled: shouldFetchSlots,
    }
  );

  const availableSlots = slotsData?.slots || [];

  // Generate next 14 days
  const getNextTwoWeeks = () => {
    const days = [];
    const today = new Date();
    const locale = isRTL ? 'ar-SA' : 'en-US';

    // Start from tomorrow (cannot reschedule to today)
    for (let i = 1; i < 15; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push({
        day: d.getDate().toString(),
        weekday: d.toLocaleDateString(locale, { weekday: 'short' }),
        fullDate: d
      });
    }
    return days;
  };

  const availableDates = getNextTwoWeeks();

  const handleConfirm = () => {
    if (!selectedDate || !selectedSlot) {
      Alert.alert(
        t.appointments?.error || 'Error',
        'Please select both date and time'
      );
      return;
    }

    const payload = {
      appointmentId: appointment.id || appointment._id,
      date: moment(selectedSlot.startTime).locale('en').format('YYYY-MM-DD'),
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
    };

    rescheduleAppointment(payload, {
      onSuccess: () => {
        Alert.alert(
          t.appointments?.success || 'Success',
          'Your appointment has been rescheduled successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                onRescheduleSuccess?.();
                navigation.goBack();
              }
            }
          ]
        );
      },
      onError: (error) => {
        Alert.alert(
          t.appointments?.error || 'Error',
          error.message || 'Failed to reschedule appointment. Please try again.'
        );
      }
    });
  };

  if (!appointment) {
    Alert.alert('Error', 'Appointment information not available');
    navigation.goBack();
    return null;
  }

  const alignText = { textAlign: isRTL ? 'right' : 'left' };
  const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };

  return (
    <View style={styles.container}>
      <Header
        title={t.appointments?.rescheduleAppointment || "Reschedule Appointment"}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Rescheduling Policy */}
        <View style={styles.policyCard}>
          <View style={[rowStyle, { alignItems: 'center', marginBottom: 8 }]}>
            <Icon name="circle-info" size={16} color={COLORS.textPrimary} />
            <Text style={[styles.policyTitle, alignText, { marginHorizontal: 8 }]}>
              {t.appointments?.reschedulePolicy || 'Appointment Change Policy'}
            </Text>
          </View>
          <Text style={[styles.policyText, alignText]}>
            {t.appointments?.reschedulePolicyText || 'You may change your appointment up to 24 hours before the scheduled time, for a maximum of 3 times.'}
          </Text>
        </View>

        {/* Current Appointment Info */}
        <View style={styles.currentInfoCard}>
          <Text style={[styles.cardTitle, alignText]}>
            {t.appointments?.currentAppointment || "Current Appointment"}
          </Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, alignText]}>
              {t.appointments?.doctor || "Doctor"}:
            </Text>
            <Text style={[styles.infoValue, alignText]}>{providerName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, alignText]}>
              {t.appointments?.date || "Date"}:
            </Text>
            <Text style={[styles.infoValue, alignText]}>
              {moment(appointment.startTime).locale('en').format('MMM DD, YYYY')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, alignText]}>
              {t.appointments?.time || "Time"}:
            </Text>
            <Text style={[styles.infoValue, alignText]}>
              {moment(appointment.startTime).locale('en').format('hh:mm A')}
            </Text>
          </View>
        </View>

        {/* New Date Selection */}
        <Text style={[styles.sectionTitle, alignText]}>
          {t.appointments?.selectNewDate || "Select New Date & Time"}
        </Text>

        {/* Date Picker */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dateScroll}
        >
          {availableDates.map((dateItem, index) => {
            const isSelected = selectedDate && moment(selectedDate).isSame(dateItem.fullDate, 'day');
            return (
              <TouchableOpacity
                key={index}
                style={[styles.dateCard, isSelected && styles.dateCardActive]}
                onPress={() => {
                  setSelectedDate(dateItem.fullDate);
                  setSelectedSlot(null); // Reset selected slot when date changes
                }}
              >
                <Text style={[styles.dateWeekday, isSelected && styles.dateTextActive]}>
                  {dateItem.weekday}
                </Text>
                <Text style={[styles.dateDay, isSelected && styles.dateTextActive]}>
                  {dateItem.day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Time Slots */}
        {selectedDate && (
          <View style={styles.slotsContainer}>
            <Text style={[styles.sectionTitle, alignText]}>
              {t.appointments?.availableSlots || "Available Time Slots"}
            </Text>

            {isLoadingSlots ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>
                  {t.appointments?.loadingSlots || "Loading available slots..."}
                </Text>
              </View>
            ) : availableSlots.length > 0 ? (
              <View style={styles.slotsGrid}>
                {availableSlots.map((slot, index) => {
                  const isSelected = selectedSlot?.startTime === slot.startTime;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.slotCard, isSelected && styles.slotCardActive]}
                      onPress={() => setSelectedSlot(slot)}
                    >
                      <Text style={[styles.slotText, isSelected && styles.slotTextActive]}>
                        {moment(slot.startTime).locale('en').format('hh:mm A')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.noSlotsContainer}>
                <Text style={styles.noSlotsText}>
                  {t.appointments?.noAvailableSlots || "No available slots for this date"}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Confirm Button */}
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            (!selectedDate || !selectedSlot || isRescheduling) && { opacity: 0.5 }
          ]}
          onPress={handleConfirm}
          disabled={!selectedDate || !selectedSlot || isRescheduling}
        >
          <Text style={styles.confirmBtnText}>
            {isRescheduling ? (t.appointments?.rescheduling || 'Rescheduling...') : (t.appointments?.confirmReschedule || 'Confirm Reschedule')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, padding: 20 },

  // Policy Card
  policyCard: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  policyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    flex: 1,
  },
  policyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginStart: 24,
  },

  currentInfoCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  infoRow: {
    marginBottom: 5,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.gray600,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 15,
  },

  // Date Picker
  dateScroll: {
    marginBottom: 20,
  },
  dateCard: {
    width: 70,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    backgroundColor: 'white',
    alignItems: 'center',
    marginRight: 10,
  },
  dateCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  dateWeekday: {
    fontSize: 12,
    color: COLORS.gray600,
    marginBottom: 5,
  },
  dateDay: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  dateTextActive: {
    color: 'white',
  },

  // Time Slots
  slotsContainer: {
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.gray600,
    fontSize: 14,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotCard: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    backgroundColor: 'white',
  },
  slotCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.promo1,
  },
  slotText: {
    fontSize: 14,
    color: COLORS.gray700,
    fontWeight: '600',
  },
  slotTextActive: {
    color: COLORS.primary,
  },
  noSlotsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noSlotsText: {
    color: COLORS.gray600,
    fontSize: 14,
  },

  // Confirm Button
  confirmBtn: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  confirmBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RescheduleAppointmentScreen;
