import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { showToast } from '../../components/InAppToast';
import { useRoute } from '@react-navigation/native';
import moment from 'moment';
import Header from '../../components/Header';
import { AppText, AppCard, AppButton, EmptyState } from '../../components/ui';
import ProviderStatusBadge from '../../components/provider/ProviderStatusBadge';
import { useLanguage } from '../../store/LanguageContext';
import {
  useGetReferralDetails,
  useChangeReferralStatus,
} from '../../api/services/Referral.Service';
import { getPatientDisplayName } from '../../utils/providerAppointments';
import COLORS from '../../constants/colors';
import { SPACING } from '../../theme';

const DetailRow = ({ label, value }) => {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <AppText variant="caption" color={COLORS.textSecondary}>{label}</AppText>
      <AppText variant="bodyMedium" style={styles.value}>{value}</AppText>
    </View>
  );
};

const ProviderReferralDetailScreen = () => {
  const route = useRoute();
  const { t, isRTL } = useLanguage();
  const pd = t.providerDashboard || {};
  const referralId = route.params?.referralId;

  const { data: referral, isLoading } = useGetReferralDetails(referralId);
  const { mutate: changeStatus, isPending } = useChangeReferralStatus();

  const patientName = getPatientDisplayName(referral?.patient, isRTL) || pd.patient;
  const isPendingStatus = referral?.status === 'pending';

  const updateStatus = (status) => {
    const confirm = status === 'rejected'
      ? pd.rejectReferralConfirm || 'Reject this referral?'
      : pd.acceptReferralConfirm || 'Accept this referral?';

    Alert.alert(
      status === 'accepted' ? (pd.acceptReferral || 'Accept referral') : (pd.rejectReferral || 'Reject referral'),
      confirm,
      [
        { text: t.common?.cancel || 'Cancel', style: 'cancel' },
        {
          text: t.common?.confirm || 'Confirm',
          style: status === 'rejected' ? 'destructive' : 'default',
          onPress: () => {
            changeStatus(
              { referralId, status },
              {
                onSuccess: () => {
                  showToast({
                    type: 'success',
                    title: t.common?.success || 'Success',
                    message: pd.referralUpdated || 'Referral updated',
                  });
                },
                onError: () => {
                  showToast({
                    type: 'error',
                    title: t.common?.error || 'Error',
                    message: pd.referralUpdateFailed || 'Could not update referral',
                  });
                },
              },
            );
          },
        },
      ],
    );
  };

  if (isLoading && !referral) {
    return (
      <View style={styles.container}>
        <Header showBack title={pd.referralDetail || 'Referral'} />
        <View style={styles.loader}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      </View>
    );
  }

  if (!referral) {
    return (
      <View style={styles.container}>
        <Header showBack title={pd.referralDetail || 'Referral'} />
        <EmptyState title={pd.referralNotFound || 'Referral not found'} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header showBack title={pd.referralDetail || 'Referral'} />
      <ScrollView contentContainerStyle={styles.content}>
        <AppCard style={styles.card}>
          <View style={styles.headerRow}>
            <AppText variant="h2">{patientName}</AppText>
            <ProviderStatusBadge status={referral.status} />
          </View>
          <DetailRow label={pd.referredBy || 'Referred by'} value={referral.referredBy?.fullName} />
          <DetailRow label={pd.urgency || 'Urgency'} value={referral.urgency} />
          <DetailRow label={pd.timeFrame || 'Time frame'} value={referral.timeFrame} />
          <DetailRow
            label={pd.receivedOn || 'Received'}
            value={referral.createdAt ? moment(referral.createdAt).format('MMM D, YYYY h:mm A') : null}
          />
          <DetailRow label={pd.reason || 'Reason'} value={referral.reason} />
          <DetailRow label={pd.notes || 'Notes'} value={referral.notes} />
        </AppCard>

        {isPendingStatus ? (
          <View style={styles.actions}>
            <AppButton
              title={pd.acceptReferral || 'Accept referral'}
              onPress={() => updateStatus('accepted')}
              disabled={isPending}
              loading={isPending}
              style={styles.btn}
            />
            <AppButton
              title={pd.rejectReferral || 'Reject referral'}
              variant="outline"
              onPress={() => updateStatus('rejected')}
              disabled={isPending}
              style={styles.btn}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { padding: SPACING.lg },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  row: { marginBottom: SPACING.md },
  value: { marginTop: SPACING.xs },
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  btn: { flex: 1 },
});

export default ProviderReferralDetailScreen;
