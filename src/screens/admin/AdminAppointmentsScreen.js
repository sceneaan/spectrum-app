import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import moment from 'moment';
import Header from '../../components/Header';
import ProviderStatusBadge from '../../components/provider/ProviderStatusBadge';
import { AppText, AppCard, SegmentedTabs, EmptyState } from '../../components/ui';
import { showToast } from '../../components/InAppToast';
import { useLanguage } from '../../store/LanguageContext';
import { useAuthStore } from '../../store/authStore';
import { useGetUserData } from '../../api/services/User.Service';
import { hasAdminPermission } from '../../utils/adminPermissions';
import { useAdminGetAppointments, useAdminCancelAppointment } from '../../api/services/Admin.Service';
import AdminRescheduleModal from '../../components/admin/AdminRescheduleModal';
import { getPatientDisplayName } from '../../utils/providerAppointments';
import COLORS from '../../constants/colors';
import { SPACING } from '../../theme';

const STATUS_TABS = [
  { key: 'all', labelKey: 'all' },
  { key: 'Pending', labelKey: 'pending' },
  { key: 'Confirmed', labelKey: 'confirmed' },
  { key: 'Completed', labelKey: 'completed' },
];

const AdminAppointmentsScreen = ({ showBack = true }) => {
  const { t, isRTL } = useLanguage();
  const ad = t.adminDashboard || {};
  const user = useAuthStore((state) => state.user);
  const { data: userData } = useGetUserData();
  const profile = userData || user;
  const canManage = hasAdminPermission(profile, 'manage_appointments');
  const [activeTab, setActiveTab] = useState('all');
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };

  const query = useMemo(() => ({
    page: 1,
    limit: 40,
    ...(activeTab !== 'all' ? { status: activeTab } : {}),
  }), [activeTab]);

  const { data, isLoading, isError, refetch, isRefetching } = useAdminGetAppointments(query);
  const { mutate: cancelAppointment, isPending: cancelling } = useAdminCancelAppointment();

  const appointments = data?.docs || data || [];
  const tabs = STATUS_TABS.map((tab) => ({
    key: tab.key,
    label: ad[tab.labelKey] || tab.key,
  }));

  const handleCancel = (item) => {
    const id = item._id || item.id;
    if (!id) return;
    Alert.alert(
      ad.cancelTitle || 'Cancel appointment',
      ad.cancelConfirm || 'Cancel this appointment?',
      [
        { text: t.common?.cancel || 'Cancel', style: 'cancel' },
        {
          text: ad.cancelAction || 'Cancel appointment',
          style: 'destructive',
          onPress: () => {
            cancelAppointment(
              { appointmentId: id, payload: { reason: 'Cancelled by admin (mobile)' } },
              {
                onSuccess: () => {
                  showToast({
                    type: 'success',
                    title: t.common?.success || 'Success',
                    message: ad.cancelledSuccess || 'Appointment cancelled',
                  });
                  refetch();
                },
                onError: () => {
                  showToast({
                    type: 'error',
                    title: t.common?.error || 'Error',
                    message: ad.cancelFailed || 'Could not cancel appointment',
                  });
                },
              },
            );
          },
        },
      ],
    );
  };

  const renderItem = ({ item }) => {
    const patientName = getPatientDisplayName(item.patient, isRTL) || ad.patient || 'Patient';
    const providerName = getPatientDisplayName(item.provider, isRTL) || ad.provider || 'Provider';
    const when = item.startTime
      ? moment(item.startTime).format('MMM D, YYYY h:mm A')
      : (item.date || '');

    return (
      <AppCard style={styles.card} padding={SPACING.lg}>
        <View style={[styles.topRow, rowStyle]}>
          <View style={styles.flex}>
            <AppText variant="bodyMedium">{patientName}</AppText>
            <AppText variant="caption" color={COLORS.textSecondary}>{providerName}</AppText>
          </View>
          <ProviderStatusBadge status={item.status} />
        </View>
        <AppText variant="bodySmall" color={COLORS.textSecondary} style={styles.when}>{when}</AppText>
        {canManage && !['Cancelled', 'Completed', 'Rejected'].includes(item.status) ? (
          <View style={[styles.actionRow, rowStyle]}>
            <TouchableOpacity onPress={() => setRescheduleTarget(item)} disabled={cancelling} style={styles.actionBtn}>
              <AppText variant="caption" color={COLORS.primaryDark}>
                {ad.rescheduleAction || 'Reschedule'}
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleCancel(item)} disabled={cancelling} style={styles.actionBtn}>
              <AppText variant="caption" color={COLORS.danger}>
                {ad.cancelAction || 'Cancel appointment'}
              </AppText>
            </TouchableOpacity>
          </View>
        ) : null}
      </AppCard>
    );
  };

  return (
    <View style={styles.container}>
      <Header showBack={showBack} title={ad.appointmentsTitle || 'Appointments'} />
      <View style={styles.tabsWrap}>
        <SegmentedTabs isRTL={isRTL} activeKey={activeTab} onChange={setActiveTab} options={tabs} />
      </View>
      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={styles.loader} />
      ) : isError ? (
        <EmptyState
          title={ad.loadError || 'Could not load appointments'}
          actionLabel={t.messaging?.retry || t.common?.retry || 'Retry'}
          onAction={refetch}
        />
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => String(item._id || item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          ListEmptyComponent={(
            <EmptyState title={ad.noAppointments || 'No appointments found'} />
          )}
        />
      )}
      <AdminRescheduleModal
        visible={Boolean(rescheduleTarget)}
        appointment={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onSuccess={() => {
          setRescheduleTarget(null);
          refetch();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabsWrap: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.sm },
  list: { padding: SPACING.lg, paddingBottom: 40 },
  loader: { marginTop: SPACING.xxl },
  card: { marginBottom: SPACING.md },
  topRow: { justifyContent: 'space-between', alignItems: 'flex-start', gap: SPACING.sm },
  flex: { flex: 1 },
  when: { marginTop: SPACING.sm },
  actionRow: { marginTop: SPACING.md, gap: SPACING.lg },
  actionBtn: { paddingVertical: SPACING.xs },
});

export default AdminAppointmentsScreen;
