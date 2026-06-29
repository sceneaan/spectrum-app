import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import moment from 'moment';
import Header from '../components/Header';
import RiyalText from '../components/RiyalText';
import Skeleton from '../components/Skeleton';
import { AppText, AppCard, SectionHeader, QuickAction } from '../components/ui';
import { useLanguage } from '../store/LanguageContext';
import { useAuthStore } from '../store/authStore';
import { useGetUpcomingAppointments } from '../api/services/Appointment.Service';
import { useGetProviderEarningStats } from '../api/services/Stats.Service';
import { usePatientToProviderRequests } from '../api/services/Refill.Service';
import { useProviderGetThreads } from '../api/services/Thread.Service';
import {
  getPatientDisplayName,
  partitionProviderSchedule,
} from '../utils/providerAppointments';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import { SPACING, RADIUS, SHADOWS, cardBorder } from '../theme';

const ProviderHomeScreen = () => {
  const navigation = useNavigation();
  const { t, isRTL } = useLanguage();
  const { user } = useAuthStore();
  const pd = t.providerDashboard || {};

  const {
    data: todayAppointments,
    isLoading: todayLoading,
    refetch: refetchToday,
    isRefetching,
  } = useGetUpcomingAppointments({ isToday: 'true' });

  const { data: earnings, isLoading: earningsLoading, refetch: refetchEarnings } = useGetProviderEarningStats();
  const { data: refillData, refetch: refetchRefills } = usePatientToProviderRequests();
  const { data: threadData, refetch: refetchThreads } = useProviderGetThreads();

  const { pendingApprovals, confirmed } = useMemo(
    () => partitionProviderSchedule(todayAppointments || []),
    [todayAppointments],
  );

  const pendingRefills = useMemo(() => {
    const docs = refillData?.docs || refillData || [];
    return docs.filter((r) => r.status === 'Pending');
  }, [refillData]);

  const unreadThreads = useMemo(() => {
    const threads = threadData?.docs || threadData?.threads || threadData || [];
    return threads.filter((item) => {
      if (typeof item?.providerUnreadCount === 'number') return item.providerUnreadCount > 0;
      if (typeof item?.unreadCount === 'number') return item.unreadCount > 0;
      return Boolean(item?.hasUnread);
    }).length;
  }, [threadData]);

  const greetingName = isRTL
    ? (user?.fullNameArabic || user?.fullName || user?.fullNameEnglish)
    : (user?.fullNameEnglish || user?.fullName || user?.fullNameArabic);

  const onRefresh = () => {
    refetchToday();
    refetchEarnings();
    refetchRefills();
    refetchThreads();
  };

  const showVideoNote = () => {
    Alert.alert(
      pd.videoOnWebTitle || 'Video sessions',
      t.videoConsultation?.providersUseWeb
        || 'Join video sessions from the Spectrum clinic website, not the mobile app.',
    );
  };

  const goAppointments = (initialTab) => {
    navigation.navigate('ProviderAppointmentsTab', { initialTab });
  };

  const previewAppointments = confirmed.slice(0, 3);

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={(
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={COLORS.primary} />
        )}
      >
        <AppText variant="h2" style={styles.greeting}>
          {pd.greeting || 'Welcome back'}
          {greetingName ? `, ${greetingName}` : ''}
        </AppText>
        <AppText variant="bodySmall" color={COLORS.textSecondary} style={styles.subtitle}>
          {pd.subtitle || 'Your clinic dashboard on mobile'}
        </AppText>

        <View style={styles.statsRow}>
          <AppCard style={styles.statCard} padding={SPACING.lg}>
            {earningsLoading ? (
              <Skeleton width={80} height={20} />
            ) : (
              <RiyalText
                text={String(earnings?.weeklyEarnings ?? 0)}
                textStyle={styles.statValue}
              />
            )}
            <AppText variant="caption" color={COLORS.textSecondary}>{pd.weeklyEarnings || 'This week'}</AppText>
          </AppCard>
          <AppCard style={styles.statCard} padding={SPACING.lg}>
            {earningsLoading ? (
              <Skeleton width={80} height={20} />
            ) : (
              <RiyalText
                text={String(earnings?.monthlyEarnings ?? 0)}
                textStyle={styles.statValue}
              />
            )}
            <AppText variant="caption" color={COLORS.textSecondary}>{pd.monthlyEarnings || 'This month'}</AppText>
          </AppCard>
        </View>

        <View style={styles.quickRow}>
          <QuickAction
            icon={ICONS.clock}
            label={`${pd.pendingApprovals || 'Approvals'}${pendingApprovals.length ? ` (${pendingApprovals.length})` : ''}`}
            onPress={() => goAppointments('approvals')}
          />
          <QuickAction
            icon={ICONS.inbox}
            label={`${pd.messages || 'Messages'}${unreadThreads > 0 ? ` (${unreadThreads})` : ''}`}
            onPress={() => navigation.navigate('ProviderInboxTab')}
          />
          <QuickAction
            icon={ICONS.refill}
            label={`${pd.refills || 'Refills'}${pendingRefills.length ? ` (${pendingRefills.length})` : ''}`}
            onPress={() => navigation.navigate('ProviderRefills')}
          />
          <QuickAction
            icon={ICONS.video}
            label={pd.video || 'Video'}
            onPress={showVideoNote}
          />
        </View>

        <SectionHeader
          title={pd.todaySchedule || "Today's schedule"}
          actionLabel={pd.viewAll || 'View all'}
          onAction={() => goAppointments('today')}
        />

        {todayLoading ? (
          <AppCard style={styles.listCard}>
            <Skeleton height={72} style={styles.skeletonLine} />
            <Skeleton height={72} style={styles.skeletonLine} />
          </AppCard>
        ) : previewAppointments.length === 0 ? (
          <AppCard muted style={styles.emptyCard}>
            <AppText variant="bodySmall" color={COLORS.textSecondary} align="center">
              {pd.noAppointmentsToday || 'No confirmed appointments for today'}
            </AppText>
          </AppCard>
        ) : (
          previewAppointments.map((item) => {
            const patientName = getPatientDisplayName(item.patient, isRTL) || pd.patient || 'Patient';
            const timeLabel = item.startTime
              ? `${moment(item.startTime).format('h:mm A')} – ${moment(item.endTime).format('h:mm A')}`
              : '';
            return (
              <TouchableOpacity
                key={item._id || item.id}
                activeOpacity={0.85}
                onPress={() => goAppointments('today')}
              >
                <AppCard style={styles.appointmentCard}>
                  <View style={styles.appointmentRow}>
                    <Image
                      source={
                        item.patient?.profileImage
                          ? { uri: item.patient.profileImage }
                          : ICONS.defaultAvatar
                      }
                      style={styles.avatar}
                    />
                    <View style={styles.appointmentBody}>
                      <AppText variant="h3">{patientName}</AppText>
                      <AppText variant="caption" color={COLORS.textSecondary}>{timeLabel}</AppText>
                      {item.reason ? (
                        <AppText variant="caption" color={COLORS.textSecondary} numberOfLines={1}>{item.reason}</AppText>
                      ) : null}
                    </View>
                  </View>
                </AppCard>
              </TouchableOpacity>
            );
          })
        )}

        {pendingApprovals.length > 0 ? (
          <>
            <SectionHeader
              title={pd.needsApproval || 'Needs your approval'}
              actionLabel={pd.review || 'Review'}
              onAction={() => goAppointments('approvals')}
            />
            <AppCard style={styles.alertCard}>
              <AppText variant="body">
                {pendingApprovals.length === 1
                  ? (pd.onePendingApproval || '1 appointment waiting for approval')
                  : (pd.pendingApprovalCount || '{{count}} appointments waiting for approval').replace(
                    '{{count}}',
                    String(pendingApprovals.length),
                  )}
              </AppText>
            </AppCard>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 100 },
  greeting: { marginBottom: SPACING.xs },
  subtitle: { marginBottom: SPACING.lg },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statCard: { flex: 1 },
  statValue: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  listCard: { marginBottom: SPACING.md },
  skeletonLine: { marginBottom: SPACING.md },
  emptyCard: { marginBottom: SPACING.md },
  appointmentCard: { marginBottom: SPACING.md },
  appointmentRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: SPACING.md,
    backgroundColor: COLORS.gray200,
  },
  appointmentBody: { flex: 1 },
  alertCard: {
    backgroundColor: COLORS.actionBg,
    borderColor: COLORS.actionBorder,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
});

export default ProviderHomeScreen;
