import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import moment from 'moment';
import { AppText, AppButton } from '../../components/ui';
import { showToast } from '../../components/InAppToast';
import { useLanguage } from '../../store/LanguageContext';
import { useRescheduleAppointment } from '../../api/services/Appointment.Service';
import { useGetSlots } from '../../api/services/Availablity.Service';
import COLORS from '../../constants/colors';
import { SPACING, RADIUS } from '../../theme';

const AdminRescheduleModal = ({ visible, appointment, onClose, onSuccess }) => {
  const { t, isRTL } = useLanguage();
  const ad = t.adminDashboard || {};
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const providerId = appointment?.provider?._id || appointment?.provider?.id || appointment?.provider;
  const slotDuration = appointment?.providerService?.slotDuration || appointment?.slotDuration || 30;

  const slotQuery = useMemo(() => ({
    date: selectedDate ? moment(selectedDate).format('YYYY-MM-DD') : undefined,
    slotDuration,
    currentTime: moment().format('YYYY-MM-DD HH:mm:ss'),
    isAdmin: true,
  }), [selectedDate, slotDuration]);

  const { data: slotsData, isLoading: slotsLoading } = useGetSlots(providerId, slotQuery, {
    enabled: Boolean(visible && providerId && selectedDate),
  });

  const slots = Array.isArray(slotsData) ? slotsData : (slotsData?.slots || []);
  const { mutate: reschedule, isPending } = useRescheduleAppointment();

  const dates = useMemo(() => {
    const items = [];
    const today = new Date();
    for (let i = 1; i < 15; i += 1) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      items.push(d);
    }
    return items;
  }, []);

  const reset = () => {
    setSelectedDate(null);
    setSelectedSlot(null);
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const handleConfirm = () => {
    if (!appointment || !selectedSlot) {
      showToast({
        type: 'error',
        title: t.common?.error || 'Error',
        message: ad.selectSlot || 'Select a date and time',
      });
      return;
    }

    reschedule(
      {
        appointmentId: appointment._id || appointment.id,
        date: moment(selectedSlot.startTime).format('YYYY-MM-DD'),
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        overrideAvailability: true,
      },
      {
        onSuccess: () => {
          showToast({
            type: 'success',
            title: t.common?.success || 'Success',
            message: ad.rescheduleSuccess || 'Appointment rescheduled',
          });
          handleClose();
          onSuccess?.();
        },
        onError: () => {
          showToast({
            type: 'error',
            title: t.common?.error || 'Error',
            message: ad.rescheduleFailed || 'Could not reschedule appointment',
          });
        },
      },
    );
  };

  if (!appointment) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <AppText variant="h3" style={styles.title}>{ad.rescheduleTitle || 'Reschedule appointment'}</AppText>
          <ScrollView contentContainerStyle={styles.content}>
            <AppText variant="caption" color={COLORS.textSecondary}>{ad.selectSlot || 'Select a date and time'}</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateRow}>
              {dates.map((date) => {
                const key = moment(date).format('YYYY-MM-DD');
                const active = selectedDate && moment(selectedDate).isSame(date, 'day');
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.datePill, active && styles.datePillActive]}
                    onPress={() => {
                      setSelectedDate(date);
                      setSelectedSlot(null);
                    }}
                  >
                    <AppText variant="caption" color={active ? COLORS.primaryDark : COLORS.textSecondary}>
                      {moment(date).format('MMM D')}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {slotsLoading ? (
              <ActivityIndicator color={COLORS.primary} style={styles.loader} />
            ) : (
              <View style={styles.slotGrid}>
                {slots.map((slot) => {
                  const active = selectedSlot?.startTime === slot.startTime;
                  return (
                    <TouchableOpacity
                      key={slot.startTime}
                      style={[styles.slotPill, active && styles.slotPillActive]}
                      onPress={() => setSelectedSlot(slot)}
                    >
                      <AppText variant="caption" color={active ? COLORS.primaryDark : COLORS.textPrimary}>
                        {moment(slot.startTime).format('h:mm A')}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
          <View style={styles.actions}>
            <AppButton title={t.common?.cancel || 'Cancel'} variant="outline" onPress={handleClose} style={styles.btn} />
            <AppButton
              title={ad.rescheduleAction || 'Reschedule'}
              onPress={handleConfirm}
              loading={isPending}
              style={styles.btn}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '82%',
    paddingBottom: SPACING.xl,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: SPACING.sm,
  },
  title: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  content: { padding: SPACING.lg },
  dateRow: { marginVertical: SPACING.md },
  datePill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceMuted,
    marginRight: SPACING.sm,
  },
  datePillActive: { backgroundColor: COLORS.primaryLight },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  slotPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceMuted,
  },
  slotPillActive: { backgroundColor: COLORS.primaryLight },
  loader: { marginVertical: SPACING.lg },
  actions: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg },
  btn: { flex: 1 },
});

export default AdminRescheduleModal;
