import React, { useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import moment from 'moment';
import Header from '../../components/Header';
import RiyalText from '../../components/RiyalText';
import Skeleton from '../../components/Skeleton';
import AppIcon from '../../components/ui/AppIcon';
import { AppText, AppCard, SectionHeader, QuickAction } from '../../components/ui';
import { useLanguage } from '../../store/LanguageContext';
import { useGetUpcomingAppointments } from '../../api/services/Appointment.Service';
import { useGetProviderEarningStats } from '../../api/services/Stats.Service';
import { usePatientToProviderRequests } from '../../api/services/Refill.Service';
import {
  normalizeThreadList,
  threadHasUnread,
} from '../../utils/threads';
import {
  useGetProviderMessageUnreadCount,
  useProviderGetThreads,
} from '../../api/services/Thread.Service';
import {
  getPatientDisplayName,
  partitionProviderSchedule,
} from '../../utils/providerAppointments';
import COLORS from '../../constants/colors';
import ICONS from '../../constants/icons';
import { formatSarAmount } from '../../utils/formatMoney';
import { SPACING, RADIUS, SHADOWS } from '../../theme';

const StatCard = ({ label, amount, loading, icon, onPress }) => (
  <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={styles.statCardWrap}>
    <AppCard style={styles.statCard} padding={SPACING.lg}>
      <View style={styles.statTop}>
        <AppText variant="caption" color={COLORS.textSecondary} style={styles.statLabel}>
          {label}
        </AppText>
        <View style={styles.statIconBadge}>
          <AppIcon name={icon} size={16} color={COLORS.primaryDark} />
        </View>
      </View>
      {loading ? (
        <Skeleton width={96} height={26} style={styles.statSkeleton} />
      ) : (
        <RiyalText text={amount} textStyle={styles.statValue} size={18} />
      )}
    </AppCard>
  </TouchableOpacity>
);

const StatusChip = ({ label, tone = 'primary', onPress }) => {
  const palette = tone === 'warning'
    ? { bg: COLORS.actionBg, text: COLORS.actionText, border: COLORS.actionBorder }
    : { bg: COLORS.primaryLight, text: COLORS.primaryDark, border: COLORS.primaryMuted };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.chip, { backgroundColor: palette.bg, borderColor: palette.border }]}
    >
      <AppText variant="caption" style={[styles.chipText, { color: palette.text }]}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
};

const ProviderHomeScreen = () => {
  const navigation = useNavigation();
  const { t, isRTL } = useLanguage();
  const pd = t.providerDashboard || {};
  const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };

  const {
    data: todayAppointments,
    isLoading: todayLoading,
    refetch: refetchToday,
    isRefetching,
  } = useGetUpcomingAppointments({ isToday: 'true' });

  const { data: earnings, isLoading: earningsLoading, refetch: refetchEarnings } = useGetProviderEarningStats();
  const { data: refillData, refetch: refetchRefills } = usePatientToProviderRequests();
  const { data: threadData, refetch: refetchThreads } = useProviderGetThreads();
  const { data: messageUnreadCount = 0, refetch: refetchMessageUnread } = useGetProviderMessageUnreadCount();

  const { pendingApprovals, confirmed } = useMemo(
    () => partitionProviderSchedule(todayAppointments || []),
    [todayAppointments],
  );

  const pendingRefills = useMemo(() => {
    const docs = refillData?.docs || refillData || [];
    return docs.filter((r) => r.status === 'Pending');
  }, [refillData]);

  const unreadThreads = useMemo(() => {
    const threads = normalizeThreadList(threadData);
    const fromList = threads.filter(threadHasUnread).length;
    return Math.max(fromList, messageUnreadCount);
  }, [threadData, messageUnreadCount]);

  const pendingCount = pendingApprovals.length + pendingRefills.length + unreadThreads;

  const onRefresh = () => {
    refetchToday();
    refetchEarnings();
    refetchRefills();
    refetchThreads();
    refetchMessageUnread();
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

  useFocusEffect(
    useCallback(() => {
      refetchThreads();
      refetchMessageUnread();
    }, [refetchThreads, refetchMessageUnread]),
  );

  const quickActions = [
    {
      key: 'revenue',
      vectorIcon: 'wallet',
      label: pd.revenueShort || 'Revenue',
      onPress: () => navigation.navigate('ProviderRevenue'),
    },
    {
      key: 'performance',
      vectorIcon: 'performance',
      label: pd.performanceShort || 'Performance',
      onPress: () => navigation.navigate('ProviderPerformance'),
    },
    {
      key: 'practice',
      vectorIcon: 'practice',
      label: pd.practiceShort || 'Practice',
      onPress: () => navigation.navigate('ProviderPracticeTab'),
    },
    {
      key: 'approvals',
      vectorIcon: 'approvals',
      label: pd.pendingApprovals || 'Approvals',
      badge: pendingApprovals.length,
      onPress: () => goAppointments('approvals'),
    },
    {
      key: 'messages',
      vectorIcon: 'inbox',
      label: pd.messages || 'Messages',
      badge: unreadThreads,
      onPress: () => navigation.navigate('ProviderInboxTab'),
    },
    {
      key: 'refills',
      vectorIcon: 'refills',
      label: pd.refills || 'Refills',
      badge: pendingRefills.length,
      onPress: () => navigation.navigate('ProviderRefills'),
    },
  ];

  return (
    <View style={styles.container}>
      <Header showProfile />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={(
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={COLORS.primary} />
        )}
      >
        <AppCard style={styles.heroCard} padding={SPACING.xl}>
          <AppText variant="label" color={COLORS.primaryDark} style={styles.heroEyebrow}>
            {(pd.clinicDashboard || 'CLINIC DASHBOARD').toUpperCase()}
          </AppText>
          <AppText variant="h2" style={styles.heroTitle}>
            {pd.subtitle || 'Manage your practice on the go'}
          </AppText>
          {pendingCount > 0 ? (
            <View style={[styles.chipRow, rowStyle]}>
              {pendingApprovals.length > 0 ? (
                <StatusChip
                  tone="warning"
                  label={(pd.approvalChip || '{{count}} approvals').replace('{{count}}', String(pendingApprovals.length))}
                  onPress={() => goAppointments('approvals')}
                />
              ) : null}
              {pendingRefills.length > 0 ? (
                <StatusChip
                  label={(pd.refillChip || '{{count}} refills').replace('{{count}}', String(pendingRefills.length))}
                  onPress={() => navigation.navigate('ProviderRefills')}
                />
              ) : null}
              {unreadThreads > 0 ? (
                <StatusChip
                  label={(pd.messageChip || '{{count}} unread').replace('{{count}}', String(unreadThreads))}
                  onPress={() => navigation.navigate('ProviderInboxTab', { filterUnread: true })}
                />
              ) : null}
            </View>
          ) : (
            <AppText variant="bodySmall" color={COLORS.textSecondary} style={styles.heroHint}>
              {pd.allCaughtUp || 'You are all caught up for now'}
            </AppText>
          )}
        </AppCard>

        <SectionHeader
          title={pd.earningsOverview || 'Earnings overview'}
          subtitle={pd.earningsHint || 'Tap a card for revenue details'}
        />

        <View style={[styles.statsRow, rowStyle]}>
          <StatCard
            label={pd.weeklyEarnings || 'This week'}
            amount={formatSarAmount(earnings?.weeklyEarnings)}
            loading={earningsLoading}
            icon="calendar-week"
            onPress={() => navigation.navigate('ProviderRevenue')}
          />
          <StatCard
            label={pd.monthlyEarnings || 'This month'}
            amount={formatSarAmount(earnings?.monthlyEarnings)}
            loading={earningsLoading}
            icon="calendar-month-outline"
            onPress={() => navigation.navigate('ProviderRevenue')}
          />
        </View>

        <SectionHeader title={pd.quickAccess || 'Quick access'} />

        <AppCard style={styles.actionsCard} padding={SPACING.lg}>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <View key={action.key} style={styles.actionCell}>
                <QuickAction
                  vectorIcon={action.vectorIcon}
                  label={action.label}
                  badge={action.badge}
                  onPress={action.onPress}
                  labelLines={1}
                />
              </View>
            ))}
          </View>
        </AppCard>

        <TouchableOpacity activeOpacity={0.88} onPress={showVideoNote}>
          <AppCard style={styles.videoNotice} padding={SPACING.md}>
            <View style={[styles.videoNoticeRow, rowStyle]}>
              <View style={[styles.videoNoticeIcon, isRTL ? styles.videoNoticeIconRtl : styles.videoNoticeIconLtr]}>
                <AppIcon name="monitor-lock" size={20} color={COLORS.textSecondary} />
              </View>
              <View style={styles.videoNoticeText}>
                <AppText variant="bodySmall" style={styles.videoNoticeTitle}>
                  {pd.videoWebOnly || 'Video sessions are web-only'}
                </AppText>
                <AppText variant="caption" color={COLORS.textSecondary}>
                  {pd.videoWebHint || 'Tap for details — join from the clinic website'}
                </AppText>
              </View>
              <AppIcon
                name="information-outline"
                size={18}
                color={COLORS.gray500}
              />
            </View>
          </AppCard>
        </TouchableOpacity>

        {pendingApprovals.length > 0 ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => goAppointments('approvals')}
            style={styles.alertTouchable}
          >
            <AppCard style={styles.alertCard} padding={SPACING.lg}>
              <View style={[styles.alertRow, rowStyle]}>
                <View style={styles.alertIconWrap}>
                  <AppIcon name="calendar-clock" size={22} color={COLORS.actionText} />
                </View>
                <View style={styles.alertBody}>
                  <AppText variant="bodyMedium" color={COLORS.actionText}>
                    {pendingApprovals.length === 1
                      ? (pd.onePendingApproval || '1 appointment waiting for approval')
                      : (pd.pendingApprovalCount || '{{count}} appointments waiting for approval').replace(
                        '{{count}}',
                        String(pendingApprovals.length),
                      )}
                  </AppText>
                  <AppText variant="caption" color={COLORS.actionSubText}>
                    {pd.reviewNow || 'Review now'}
                  </AppText>
                </View>
                <AppIcon
                  name={isRTL ? 'chevron-left' : 'chevron-right'}
                  size={22}
                  color={COLORS.actionText}
                />
              </View>
            </AppCard>
          </TouchableOpacity>
        ) : null}

        <SectionHeader
          title={pd.todaySchedule || "Today's schedule"}
          subtitle={pd.scheduleSubtitle
            ? pd.scheduleSubtitle.replace('{{count}}', String(confirmed.length))
            : `${confirmed.length} confirmed today`}
          actionLabel={pd.viewAll || 'View all'}
          onAction={() => goAppointments('today')}
        />

        {todayLoading ? (
          <AppCard style={styles.listCard} padding={SPACING.lg}>
            <Skeleton height={76} style={styles.skeletonLine} />
            <Skeleton height={76} />
          </AppCard>
        ) : previewAppointments.length === 0 ? (
          <AppCard muted style={styles.emptyCard} padding={SPACING.xxl}>
            <View style={styles.emptyInner}>
              <View style={styles.emptyIconWrap}>
                <AppIcon name="calendar-blank-outline" size={28} color={COLORS.primaryDark} />
              </View>
              <AppText variant="h3" align="center" style={styles.emptyTitle}>
                {pd.noAppointmentsToday || 'No confirmed appointments for today'}
              </AppText>
              <AppText variant="bodySmall" color={COLORS.textSecondary} align="center" style={styles.emptySubtitle}>
                {pd.scheduleEmptyHint || 'Approved sessions will appear here'}
              </AppText>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => goAppointments('all')}>
                <AppText variant="bodySmall" color={COLORS.primaryDark} style={styles.emptyBtnText}>
                  {pd.viewSchedule || 'View schedule'}
                </AppText>
              </TouchableOpacity>
            </View>
          </AppCard>
        ) : (
          previewAppointments.map((item) => {
            const patientName = getPatientDisplayName(item.patient, isRTL) || pd.patient || 'Patient';
            const startLabel = item.startTime ? moment(item.startTime).format('h:mm A') : '—';
            const endLabel = item.endTime ? moment(item.endTime).format('h:mm A') : '';

            return (
              <TouchableOpacity
                key={item._id || item.id}
                activeOpacity={0.88}
                onPress={() => goAppointments('today')}
              >
                <AppCard style={styles.appointmentCard} padding={SPACING.lg}>
                  <View style={[styles.appointmentRow, rowStyle]}>
                    <View style={[styles.timePill, isRTL ? styles.timePillRtl : styles.timePillLtr]}>
                      <AppText variant="label" color={COLORS.primaryDark}>{startLabel}</AppText>
                      {endLabel ? (
                        <AppText variant="caption" color={COLORS.textSecondary}>{endLabel}</AppText>
                      ) : null}
                    </View>
                    <Image
                      source={
                        item.patient?.profileImage
                          ? { uri: item.patient.profileImage }
                          : ICONS.defaultAvatar
                      }
                      style={[styles.avatar, isRTL ? styles.avatarRtl : styles.avatarLtr]}
                    />
                    <View style={styles.appointmentBody}>
                      <AppText variant="bodyMedium" numberOfLines={1}>{patientName}</AppText>
                      {item.reason ? (
                        <AppText variant="caption" color={COLORS.textSecondary} numberOfLines={1}>
                          {item.reason}
                        </AppText>
                      ) : (
                        <AppText variant="caption" color={COLORS.textSecondary}>
                          {pd.confirmedSession || 'Confirmed session'}
                        </AppText>
                      )}
                    </View>
                    <AppIcon
                      name={isRTL ? 'chevron-left' : 'chevron-right'}
                      size={20}
                      color={COLORS.gray500}
                    />
                  </View>
                </AppCard>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 110 },
  heroCard: {
    marginBottom: SPACING.xl,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryMuted,
  },
  heroEyebrow: {
    letterSpacing: 1.2,
    marginBottom: SPACING.sm,
    fontWeight: '700',
  },
  heroTitle: {
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  heroHint: { lineHeight: 20 },
  chipRow: {
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  chipText: { fontWeight: '600' },
  statsRow: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  statCardWrap: { flex: 1 },
  statCard: { minHeight: 96 },
  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  statLabel: { fontWeight: '600', flex: 1 },
  statIconBadge: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statSkeleton: { marginTop: SPACING.xs },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  actionsCard: { marginBottom: SPACING.md },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  actionCell: {
    width: '33.33%',
    paddingHorizontal: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  videoNotice: {
    marginBottom: SPACING.xl,
    backgroundColor: COLORS.surfaceMuted,
    borderColor: COLORS.border,
  },
  videoNoticeRow: { alignItems: 'center' },
  videoNoticeIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoNoticeIconLtr: { marginRight: SPACING.md },
  videoNoticeIconRtl: { marginLeft: SPACING.md },
  videoNoticeText: { flex: 1 },
  videoNoticeTitle: { fontWeight: '600', marginBottom: 2 },
  alertTouchable: { marginBottom: SPACING.xl },
  alertCard: {
    backgroundColor: COLORS.actionBg,
    borderColor: COLORS.actionBorder,
    borderWidth: 1,
  },
  alertRow: { alignItems: 'center' },
  alertIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.actionIconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBody: {
    flex: 1,
    marginHorizontal: SPACING.md,
  },
  listCard: { marginBottom: SPACING.md },
  skeletonLine: { marginBottom: SPACING.md },
  emptyCard: { marginBottom: SPACING.md },
  emptyInner: { alignItems: 'center' },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: { marginBottom: SPACING.xs },
  emptySubtitle: { marginBottom: SPACING.lg, lineHeight: 20 },
  emptyBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.primaryMuted,
    backgroundColor: COLORS.surface,
  },
  emptyBtnText: { fontWeight: '600' },
  appointmentCard: { marginBottom: SPACING.md },
  appointmentRow: { alignItems: 'center' },
  timePill: {
    minWidth: 72,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
  },
  timePillLtr: { marginRight: SPACING.md },
  timePillRtl: { marginLeft: SPACING.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.gray200,
  },
  avatarLtr: { marginRight: SPACING.md },
  avatarRtl: { marginLeft: SPACING.md },
  appointmentBody: { flex: 1 },
});

export default ProviderHomeScreen;
