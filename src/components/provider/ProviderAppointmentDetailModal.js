import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import moment from 'moment';
import AppIcon from '../ui/AppIcon';
import { AppText, AppButton, AppCard } from '../ui';
import ProviderStatusBadge from './ProviderStatusBadge';
import { getPatientDisplayName } from '../../utils/providerAppointments';
import COLORS from '../../constants/colors';
import ICONS from '../../constants/icons';
import { SPACING, RADIUS } from '../../theme';

const ProviderAppointmentDetailModal = ({
  visible,
  appointment,
  onClose,
  onApprove,
  onReject,
  isRTL,
  t,
  pd,
  busy,
}) => {
  if (!appointment) return null;

  const patientName = getPatientDisplayName(appointment.patient, isRTL) || pd.patient || 'Patient';
  const needsApproval = appointment.approvedByDoctor === false;
  const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
  const timeLabel = appointment.startTime
    ? `${moment(appointment.startTime).format('MMM D, YYYY · h:mm A')} – ${moment(appointment.endTime).format('h:mm A')}`
    : '';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={[styles.handleRow, rowStyle]}>
            <AppText variant="h3" style={styles.flex}>{pd.appointmentDetail || 'Appointment'}</AppText>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <AppIcon name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={[styles.patientRow, rowStyle]}>
              <Image
                source={appointment.patient?.profileImage ? { uri: appointment.patient.profileImage } : ICONS.defaultAvatar}
                style={styles.avatar}
              />
              <View style={styles.flex}>
                <AppText variant="bodyMedium">{patientName}</AppText>
                <ProviderStatusBadge
                  status={needsApproval ? 'pending' : appointment.status}
                  label={needsApproval ? (pd.awaitingApproval || 'Awaiting approval') : appointment.status}
                />
              </View>
            </View>

            <AppCard muted padding={SPACING.md} style={styles.block}>
              <AppText variant="caption" color={COLORS.textSecondary}>{pd.date || 'Date'}</AppText>
              <AppText variant="bodySmall">{timeLabel || '—'}</AppText>
            </AppCard>

            {appointment.reason ? (
              <AppCard muted padding={SPACING.md} style={styles.block}>
                <AppText variant="caption" color={COLORS.textSecondary}>{pd.reason || 'Reason'}</AppText>
                <AppText variant="bodySmall">{appointment.reason}</AppText>
              </AppCard>
            ) : null}

            {appointment.status ? (
              <AppCard muted padding={SPACING.md} style={styles.block}>
                <AppText variant="caption" color={COLORS.textSecondary}>{pd.status || 'Status'}</AppText>
                <AppText variant="bodySmall">{appointment.status}</AppText>
              </AppCard>
            ) : null}
          </ScrollView>

          {needsApproval ? (
            <View style={[styles.actions, rowStyle]}>
              <AppButton
                title={pd.approve || 'Approve'}
                onPress={() => onApprove?.(appointment)}
                disabled={busy}
                style={styles.actionBtn}
              />
              <AppButton
                title={pd.reject || 'Reject'}
                variant="outline"
                onPress={() => onReject?.(appointment)}
                disabled={busy}
                style={styles.actionBtn}
              />
            </View>
          ) : (
            <AppButton title={t.common?.close || 'Close'} variant="outline" onPress={onClose} fullWidth />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '85%',
  },
  handleRow: { alignItems: 'center', marginBottom: SPACING.lg },
  closeBtn: { padding: SPACING.sm },
  patientRow: { alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.lg },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.gray200 },
  flex: { flex: 1, minWidth: 0 },
  block: { marginBottom: SPACING.md },
  actions: { gap: SPACING.sm, marginTop: SPACING.lg },
  actionBtn: { flex: 1 },
});

export default ProviderAppointmentDetailModal;
