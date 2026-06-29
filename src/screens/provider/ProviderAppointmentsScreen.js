import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import moment from 'moment';
import { useQueryClient } from '@tanstack/react-query';
import Header from '../../components/Header';
import ProviderStatusBadge from '../../components/provider/ProviderStatusBadge';
import { AppText, AppCard, SegmentedTabs, EmptyState, AppButton } from '../../components/ui';
import { useLanguage } from '../../store/LanguageContext';
import {
  useGetUpcomingAppointments,
  useGetProviderAppointments,
  useApproveAppointment,
  useRejectAppointment,
} from '../../api/services/Appointment.Service';
import {
  getAppointmentId,
  getPatientDisplayName,
  isActiveProviderAppointment,
  partitionProviderSchedule,
} from '../../utils/providerAppointments';
import { isRTL } from '../../utils/rtlUtils';
import COLORS from '../../constants/colors';
import ICONS from '../../constants/icons';
import { SPACING, RADIUS, SHADOWS, cardBorder } from '../../theme';

const TAB_KEYS = ['today', 'approvals', 'all'];

const normalizeTab = (tab) => {
  if (tab === 'upcoming') return 'all';
  return TAB_KEYS.includes(tab) ? tab : 'today';
};

const ProviderAppointmentsScreen = () => {
  const route = useRoute();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const pd = t.providerDashboard || {};
  const rtl = isRTL();
  const rowStyle = { flexDirection: rtl ? 'row-reverse' : 'row' };

  const initialTab = normalizeTab(route.params?.initialTab);
  const [activeTab, setActiveTab] = useState(initialTab);

  const {
    data: todayData,
    isLoading: todayLoading,
    refetch: refetchToday,
    isRefetching: todayRefreshing,
  } = useGetUpcomingAppointments({ isToday: 'true' });

  const {
    data: allData,
    isLoading: allLoading,
    refetch: refetchAll,
    isRefetching: allRefreshing,
  } = useGetProviderAppointments();

  const { mutate: approve, isPending: approving } = useApproveAppointment();
  const { mutate: reject, isPending: rejecting } = useRejectAppointment();

  useFocusEffect(
    useCallback(() => {
      if (route.params?.initialTab) {
        setActiveTab(normalizeTab(route.params.initialTab));
      }
    }, [route.params?.initialTab]),
  );

  const { pendingApprovals, confirmed } = useMemo(
    () => partitionProviderSchedule(todayData || []),
    [todayData],
  );

  const upcomingAll = useMemo(
    () => (allData || []).filter(isActiveProviderAppointment),
    [allData],
  );

  const listData = useMemo(() => {
    if (activeTab === 'today') return confirmed;
    if (activeTab === 'approvals') return pendingApprovals;
    return upcomingAll;
  }, [activeTab, confirmed, pendingApprovals, upcomingAll]);

  const isLoading = activeTab === 'all' ? allLoading : todayLoading;
  const isRefreshing = activeTab === 'all' ? allRefreshing : todayRefreshing;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['upcomingAppointments'] });
    queryClient.invalidateQueries({ queryKey: ['providerAppointments'] });
  };

  const onRefresh = () => {
    refetchToday();
    refetchAll();
  };

  const handleApprove = (appointment) => {
    const id = getAppointmentId(appointment);
    if (!id) return;
    approve(id, {
      onSuccess: () => {
        invalidate();
        Alert.alert(t.common?.success || 'Success', pd.approvedSuccess || 'Appointment approved');
      },
      onError: () => {
        Alert.alert(t.common?.error || 'Error', pd.approveFailed || 'Could not approve appointment');
      },
    });
  };

  const handleReject = (appointment) => {
    const id = getAppointmentId(appointment);
    if (!id) return;
    Alert.alert(
      pd.rejectTitle || 'Reject appointment',
      pd.rejectConfirm || 'The patient will be refunded. Continue?',
      [
        { text: t.common?.cancel || 'Cancel', style: 'cancel' },
        {
          text: pd.reject || 'Reject',
          style: 'destructive',
          onPress: () => {
            reject(id, {
              onSuccess: () => {
                invalidate();
                Alert.alert(t.common?.success || 'Success', pd.rejectedSuccess || 'Appointment rejected');
              },
              onError: () => {
                Alert.alert(t.common?.error || 'Error', pd.rejectFailed || 'Could not reject appointment');
              },
            });
          },
        },
      ],
    );
  };

  const tabs = [
    { key: 'today', label: pd.today || 'Today' },
    { key: 'approvals', label: pd.approvals || 'Approvals' },
    { key: 'all', label: pd.upcoming || 'Upcoming' },
  ];

  const renderItem = ({ item }) => {
    const patientName = getPatientDisplayName(item.patient, rtl) || pd.patient || 'Patient';
    const startLabel = item.startTime ? moment(item.startTime).format('h:mm A') : '—';
    const endLabel = item.endTime ? moment(item.endTime).format('h:mm A') : '';
    const dateLabel = item.startTime && activeTab === 'all'
      ? moment(item.startTime).format('MMM D')
      : null;
    const needsApproval = item.approvedByDoctor === false;
    const busy = approving || rejecting;
    const statusLabel = needsApproval
      ? (pd.awaitingApproval || 'Awaiting approval')
      : (item.status || pd.confirmedSession || 'Confirmed');

    return (
      <AppCard style={styles.card} padding={SPACING.lg}>
        <View style={[styles.cardRow, rowStyle]}>
          <View style={[styles.timePill, rtl ? styles.timePillRtl : styles.timePillLtr]}>
            {dateLabel ? (
              <AppText variant="caption" color={COLORS.textSecondary}>{dateLabel}</AppText>
            ) : null}
            <AppText variant="label" color={COLORS.primaryDark}>{startLabel}</AppText>
            {endLabel ? (
              <AppText variant="caption" color={COLORS.textSecondary}>{endLabel}</AppText>
            ) : null}
          </View>

          <Image
            source={item.patient?.profileImage ? { uri: item.patient.profileImage } : ICONS.defaultAvatar}
            style={[styles.avatar, rtl ? styles.avatarRtl : styles.avatarLtr]}
          />

          <View style={styles.body}>
            <AppText variant="bodyMedium" numberOfLines={1}>{patientName}</AppText>
            {item.reason ? (
              <AppText variant="caption" color={COLORS.textSecondary} numberOfLines={2}>
                {item.reason}
              </AppText>
            ) : null}
            <View style={[styles.badgeRow, rowStyle]}>
              <ProviderStatusBadge
                status={needsApproval ? 'pending' : item.status}
                label={statusLabel}
              />
            </View>
          </View>
        </View>

        {needsApproval ? (
          <View style={[styles.actions, rowStyle]}>
            <AppButton
              title={pd.approve || 'Approve'}
              onPress={() => handleApprove(item)}
              disabled={busy}
              style={styles.actionBtn}
            />
            <AppButton
              title={pd.reject || 'Reject'}
              variant="outline"
              onPress={() => handleReject(item)}
              disabled={busy}
              style={styles.actionBtn}
            />
          </View>
        ) : null}
      </AppCard>
    );
  };

  const emptyMessage = activeTab === 'approvals'
    ? (pd.noApprovals || 'No appointments need approval')
    : activeTab === 'today'
      ? (pd.noToday || 'No appointments scheduled for today')
      : (pd.noUpcoming || 'No upcoming appointments');

  return (
    <View style={styles.container}>
      <Header title={pd.appointmentsTitle || 'Schedule'} showProfile />
      <View style={styles.tabsWrap}>
        <SegmentedTabs
          isRTL={rtl}
          activeKey={activeTab}
          onChange={setActiveTab}
          options={tabs}
        />
      </View>
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => String(getAppointmentId(item))}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={(
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          )}
          ListEmptyComponent={(
            <EmptyState
              icon={ICONS.calendar}
              title={emptyMessage}
              subtitle={pd.appointmentsEmptyHint || 'Pull to refresh'}
            />
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabsWrap: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  list: { padding: SPACING.lg, paddingBottom: 100 },
  card: {
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
    ...cardBorder,
  },
  cardRow: { alignItems: 'center' },
  timePill: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    minWidth: 72,
    alignItems: 'center',
  },
  timePillLtr: { marginRight: SPACING.md },
  timePillRtl: { marginLeft: SPACING.md },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.gray200,
  },
  avatarLtr: { marginRight: SPACING.md },
  avatarRtl: { marginLeft: SPACING.md },
  body: { flex: 1, minWidth: 0 },
  badgeRow: { marginTop: SPACING.xs },
  actions: {
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  actionBtn: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default ProviderAppointmentsScreen;
