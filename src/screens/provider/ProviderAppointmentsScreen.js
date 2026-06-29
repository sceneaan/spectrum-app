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
import COLORS from '../../constants/colors';
import ICONS from '../../constants/icons';
import { SPACING, RADIUS } from '../../theme';

const TAB_KEYS = ['today', 'approvals', 'all'];

const ProviderAppointmentsScreen = () => {
  const route = useRoute();
  const queryClient = useQueryClient();
  const { t, isRTL } = useLanguage();
  const pd = t.providerDashboard || {};

  const initialTab = route.params?.initialTab;
  const [activeTab, setActiveTab] = useState(
    TAB_KEYS.includes(initialTab) ? initialTab : 'today',
  );

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
      if (route.params?.initialTab && TAB_KEYS.includes(route.params.initialTab)) {
        setActiveTab(route.params.initialTab);
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
    const patientName = getPatientDisplayName(item.patient, isRTL) || pd.patient || 'Patient';
    const timeLabel = item.startTime
      ? `${moment(item.startTime).format('MMM D, h:mm A')} – ${moment(item.endTime).format('h:mm A')}`
      : '';
    const needsApproval = item.approvedByDoctor === false;
    const busy = approving || rejecting;

    return (
      <AppCard style={styles.card}>
        <View style={styles.row}>
          <Image
            source={item.patient?.profileImage ? { uri: item.patient.profileImage } : ICONS.defaultAvatar}
            style={styles.avatar}
          />
          <View style={styles.body}>
            <AppText variant="h3">{patientName}</AppText>
            <AppText variant="caption" color={COLORS.textSecondary}>{timeLabel}</AppText>
            {item.reason ? <AppText variant="caption" color={COLORS.textSecondary} numberOfLines={2}>{item.reason}</AppText> : null}
            {item.status ? (
              <AppText variant="caption" style={styles.status}>
                {item.status}
                {needsApproval ? ` · ${pd.awaitingApproval || 'Awaiting approval'}` : ''}
              </AppText>
            ) : null}
          </View>
        </View>
        {needsApproval ? (
          <View style={styles.actions}>
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
      <Header title={pd.appointmentsTitle || 'Schedule'} />
      <View style={styles.tabsWrap}>
        <SegmentedTabs
          isRTL={isRTL}
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
  card: { marginBottom: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: SPACING.md,
    backgroundColor: COLORS.gray200,
  },
  body: { flex: 1 },
  status: { color: COLORS.primary, marginTop: SPACING.xs },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  actionBtn: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default ProviderAppointmentsScreen;
