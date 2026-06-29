import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { AppText, AppButton, AppCard } from '../ui';
import ProviderStatusBadge from './ProviderStatusBadge';
import { useLanguage } from '../../store/LanguageContext';
import { useProcessRefillRequest } from '../../api/services/Refill.Service';
import { getPatientDisplayName } from '../../utils/providerAppointments';
import COLORS from '../../constants/colors';
import { SPACING, RADIUS, SHADOWS } from '../../theme';
import moment from 'moment';

const ProviderRefillModal = ({
  visible,
  refill,
  onClose,
  onUpdated,
}) => {
  const { t, isRTL } = useLanguage();
  const pd = t.providerDashboard || {};
  const [selectedIds, setSelectedIds] = useState([]);
  const { mutate: processRefill, isPending: processing } = useProcessRefillRequest();

  const refillId = refill?._id || refill?.id;
  const medicationList = refill?.medications;

  useEffect(() => {
    if (!visible) {
      setSelectedIds([]);
      return;
    }
    const meds = medicationList || [];
    const pendingIds = meds
      .filter((med) => med.status === 'Pending' || !med.status)
      .map((med) => med._id || med.id)
      .filter(Boolean);
    setSelectedIds(pendingIds);
  }, [visible, refillId, medicationList]);

  const medications = medicationList || [];

  const pendingMeds = useMemo(
    () => medications.filter((med) => med.status === 'Pending' || !med.status),
    [medications],
  );

  const processedCount = medications.filter(
    (med) => med.status === 'Approved' || med.status === 'Declined',
  ).length;

  const toggleMed = (id) => {
    setSelectedIds((prev) => (
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    ));
  };

  const runAction = (action) => {
    if (!selectedIds.length) {
      Alert.alert(t.common?.error || 'Error', pd.selectMedication || 'Select at least one medication');
      return;
    }
    const id = refill?._id || refill?.id;
    if (!id) return;

    processRefill(
      { id, payload: { action, selectedMedications: selectedIds } },
      {
        onSuccess: () => {
          onUpdated?.();
          Alert.alert(
            t.common?.success || 'Success',
            action === 'approve'
              ? (pd.refillApproved || 'Refill approved')
              : (pd.refillRejected || 'Refill declined'),
          );
          if (processedCount + selectedIds.length >= medications.length) {
            onClose?.();
          } else {
            setSelectedIds([]);
          }
        },
        onError: () => {
          Alert.alert(t.common?.error || 'Error', pd.refillFailed || 'Could not update refill request');
        },
      },
    );
  };

  const patientName = getPatientDisplayName(refill?.patient, isRTL) || pd.patient || 'Patient';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <AppText variant="h3" style={styles.title}>{pd.refillReview || 'Review refill request'}</AppText>
          <AppText variant="bodySmall" color={COLORS.textSecondary}>{patientName}</AppText>
          {refill?.createdAt ? (
            <AppText variant="caption" color={COLORS.textSecondary} style={styles.date}>
              {moment(refill.createdAt).format('MMM D, YYYY h:mm A')}
            </AppText>
          ) : null}

          <AppText variant="caption" color={COLORS.textSecondary} style={styles.progress}>
            {(pd.refillProgress || '{{done}} of {{total}} medications processed')
              .replace('{{done}}', String(processedCount))
              .replace('{{total}}', String(medications.length))}
          </AppText>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {medications.map((med) => {
              const medId = med._id || med.id;
              const isPending = med.status === 'Pending' || !med.status;
              const selected = selectedIds.includes(medId);
              const dose = [med.dose, med.unit].filter(Boolean).join(' ');
              return (
                <Pressable
                  key={medId}
                  disabled={!isPending || processing}
                  onPress={() => isPending && !processing && toggleMed(medId)}
                >
                  <AppCard style={[styles.medCard, selected && styles.medCardSelected]} padding={SPACING.lg}>
                    <View style={styles.medRow}>
                      {isPending ? (
                        <View style={[styles.checkbox, selected && styles.checkboxOn]}>
                          {selected ? <Icon name="check" size={12} color={COLORS.white} /> : null}
                        </View>
                      ) : (
                        <View style={styles.checkboxSpacer} />
                      )}
                      <View style={styles.medBody}>
                        <AppText variant="bodyMedium">{med.drugName || pd.medication}</AppText>
                        {dose ? <AppText variant="caption" color={COLORS.textSecondary}>{dose}</AppText> : null}
                        {med.frequency ? (
                          <AppText variant="caption" color={COLORS.textSecondary}>{med.frequency}</AppText>
                        ) : null}
                      </View>
                      {!isPending ? <ProviderStatusBadge status={med.status} /> : null}
                    </View>
                  </AppCard>
                </Pressable>
              );
            })}
          </ScrollView>

          {pendingMeds.length > 0 ? (
            <View style={styles.actions}>
              <AppButton
                title={pd.approveSelected || 'Approve selected'}
                onPress={() => runAction('approve')}
                disabled={processing}
                loading={processing}
                style={styles.btn}
              />
              <AppButton
                title={pd.declineSelected || 'Decline selected'}
                variant="outline"
                onPress={() => runAction('decline')}
                disabled={processing}
                style={styles.btn}
              />
            </View>
          ) : (
            <AppButton title={t.common?.close || 'Close'} onPress={onClose} />
          )}

          <AppButton title={t.common?.cancel || 'Cancel'} variant="ghost" onPress={onClose} style={styles.cancel} />
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
    maxHeight: '88%',
    ...SHADOWS.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.gray200,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  title: { marginBottom: SPACING.xs },
  date: { marginTop: SPACING.xs },
  progress: { marginVertical: SPACING.md },
  list: { maxHeight: 320 },
  listContent: { paddingBottom: SPACING.md },
  medCard: { marginBottom: SPACING.sm },
  medCardSelected: { borderColor: COLORS.primary, borderWidth: 1 },
  medRow: { flexDirection: 'row', alignItems: 'flex-start' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.gray400,
    marginRight: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxOn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxSpacer: { width: 22, marginRight: SPACING.md },
  medBody: { flex: 1 },
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  btn: { flex: 1 },
  cancel: { marginTop: SPACING.sm },
});

export default ProviderRefillModal;
