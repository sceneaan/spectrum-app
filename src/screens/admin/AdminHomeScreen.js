import React, { useMemo, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  DeviceEventEmitter,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Header from '../../components/Header';
import AppIcon from '../../components/ui/AppIcon';
import { showToast } from '../../components/InAppToast';
import { AppText, AppCard, SectionHeader, QuickAction } from '../../components/ui';
import { useLanguage } from '../../store/LanguageContext';
import { useAuthStore } from '../../store/authStore';
import { hasAdminPermission } from '../../utils/adminPermissions';
import { useGetUserData } from '../../api/services/User.Service';
import {
  useAdminGetClinicPendingCount,
  useAdminGetLiveAppointments,
  useAdminGetPatients,
  useAdminGetProviders,
} from '../../api/services/Admin.Service';
import COLORS from '../../constants/colors';
import { SPACING, RADIUS, SHADOWS } from '../../theme';
import useGlassTabBarInset from '../../navigation/useGlassTabBarInset';

const StatCard = ({ label, value, icon, onPress, tone = 'primary' }) => {
  const palette = tone === 'warning'
    ? { bg: COLORS.actionBg, text: COLORS.actionText, border: COLORS.actionBorder }
    : { bg: COLORS.primaryLight, text: COLORS.primaryDark, border: COLORS.primaryMuted };

  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={styles.statWrap}>
      <AppCard style={[styles.statCard, { borderColor: palette.border }]} padding={SPACING.lg}>
        <View style={styles.statTop}>
          <AppText variant="caption" color={COLORS.textSecondary}>{label}</AppText>
          <View style={[styles.statIcon, { backgroundColor: palette.bg }]}>
            <AppIcon name={icon} size={16} color={palette.text} />
          </View>
        </View>
        <AppText variant="h2" style={{ color: palette.text }}>{value}</AppText>
      </AppCard>
    </TouchableOpacity>
  );
};

const AdminHomeScreen = () => {
  const navigation = useNavigation();
  const { t, isRTL } = useLanguage();
  const ad = t.adminDashboard || {};
  const user = useAuthStore((state) => state.user);
  const { data: userData } = useGetUserData();
  const profile = userData || user;
  const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
  const tabBarInset = useGlassTabBarInset();

  const canViewAppointments = hasAdminPermission(profile, 'view_appointments');
  const canViewPatients = hasAdminPermission(profile, 'view_patients');
  const canViewProviders = hasAdminPermission(profile, 'view_providers');

  const { data: pendingClinic, refetch: refetchClinic, isRefetching: clinicRefreshing } = useAdminGetClinicPendingCount();
  const { data: liveSessions, refetch: refetchLive, isRefetching: liveRefreshing } = useAdminGetLiveAppointments();
  const { data: patientsData, refetch: refetchPatients, isRefetching: patientsRefreshing } = useAdminGetPatients({
    page: 1,
    limit: 20,
    status: 'pending',
  });
  const { data: providersData, refetch: refetchProviders, isRefetching: providersRefreshing } = useAdminGetProviders({
    page: 1,
    limit: 20,
    status: 'pending',
  });

  const pendingPatients = patientsData?.users?.length || 0;
  const pendingProviders = providersData?.users?.length || 0;
  const liveCount = Array.isArray(liveSessions) ? liveSessions.length : (liveSessions?.docs?.length || 0);
  const clinicPending = pendingClinic?.count ?? pendingClinic ?? 0;

  const onRefresh = () => {
    refetchClinic();
    refetchLive();
    if (canViewPatients) refetchPatients();
    if (canViewProviders) refetchProviders();
  };

  const isRefreshing = clinicRefreshing || liveRefreshing || patientsRefreshing || providersRefreshing;

  useFocusEffect(useCallback(() => {
    onRefresh();
  }, []));

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('socket:clinicBookingCreated', () => {
      refetchClinic();
      showToast({
        type: 'notification',
        title: ad.newClinicBooking || 'New clinic booking',
        message: ad.clinicBookingTap || 'Tap to review pending bookings',
        navigateTo: 'AdminClinicBookings',
      });
    });
    return () => sub.remove();
  }, [ad, refetchClinic]);

  const quickActions = useMemo(() => {
    const actions = [];
    if (canViewAppointments) {
      actions.push({
        key: 'appointments',
        vectorIcon: 'calendar',
        label: ad.tabAppointments || 'Appointments',
        onPress: () => navigation.navigate('AdminAppointmentsTab'),
      });
      actions.push({
        key: 'bookings',
        vectorIcon: 'calendar-clock',
        label: ad.tabBookings || 'Clinic Bookings',
        badge: clinicPending > 0 ? clinicPending : undefined,
        onPress: () => navigation.navigate('AdminBookingsTab'),
      });
    }
    if (canViewPatients) {
      actions.push({
        key: 'patients',
        vectorIcon: 'search',
        label: ad.tabUsers || 'Patients',
        onPress: () => navigation.navigate('AdminUsersTab', { initialTab: 'patients' }),
      });
    }
    if (canViewProviders) {
      actions.push({
        key: 'providers',
        vectorIcon: 'practice',
        label: ad.providers || 'Providers',
        onPress: () => navigation.navigate('AdminUsersTab', { initialTab: 'providers' }),
      });
    }
    if (hasAdminPermission(profile, 'view_refunds') || hasAdminPermission(profile, 'view_transactions')) {
      actions.push({
        key: 'financial',
        vectorIcon: 'wallet',
        label: ad.financialHubTitle || 'Financial hub',
        onPress: () => navigation.navigate('AdminFinancial'),
      });
    }
    if (hasAdminPermission(profile, 'view_refunds')) {
      actions.push({
        key: 'refunds',
        vectorIcon: 'wallet',
        label: ad.refundsTitle || 'Refund history',
        onPress: () => navigation.navigate('AdminRefunds'),
      });
    }
    if (hasAdminPermission(profile, 'view_wallets') || hasAdminPermission(profile, 'manage_wallets')) {
      actions.push({
        key: 'wallet',
        vectorIcon: 'wallet',
        label: ad.walletLookupTitle || 'Patient wallet',
        onPress: () => navigation.navigate('AdminWalletLookup'),
      });
    }
    if (hasAdminPermission(profile, 'view_discounts') || hasAdminPermission(profile, 'manage_discounts')) {
      actions.push({
        key: 'discounts',
        vectorIcon: 'wallet',
        label: ad.discounts || 'Discount Codes',
        onPress: () => navigation.navigate('AdminDiscounts'),
      });
    }
    actions.push({
      key: 'notify',
      vectorIcon: 'inbox',
      label: ad.notifications || 'Notifications',
      onPress: () => navigation.navigate('AdminNotifications'),
    });
    return actions;
  }, [ad, profile, canViewAppointments, canViewPatients, canViewProviders, clinicPending, navigation]);

  const opsCount = clinicPending + pendingPatients + pendingProviders;

  return (
    <View style={styles.container}>
      <Header showProfile />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarInset }]}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <AppCard style={styles.heroCard} padding={SPACING.xl}>
          <AppText variant="label" color={COLORS.primaryDark}>
            {(ad.opsDashboard || 'OPERATIONS DASHBOARD').toUpperCase()}
          </AppText>
          <AppText variant="h2" style={styles.heroTitle}>
            {ad.subtitle || 'Manage clinic operations on the go'}
          </AppText>
          {opsCount > 0 ? (
            <AppText variant="bodySmall" color={COLORS.actionText}>
              {(ad.pendingOps || '{{count}} items need attention').replace('{{count}}', String(opsCount))}
            </AppText>
          ) : (
            <AppText variant="bodySmall" color={COLORS.textSecondary}>
              {ad.allCaughtUp || 'All queues are clear'}
            </AppText>
          )}
        </AppCard>

        <SectionHeader title={ad.todayOverview || 'Today at a glance'} />
        <View style={[styles.statsRow, rowStyle]}>
          {canViewAppointments ? (
            <>
              <StatCard
                label={ad.liveSessions || 'Live sessions'}
                value={String(liveCount)}
                icon="video"
                onPress={() => navigation.navigate('AdminAppointmentsTab')}
              />
              <StatCard
                label={ad.pendingBookings || 'Clinic bookings'}
                value={String(clinicPending)}
                icon="calendar-clock"
                tone={clinicPending > 0 ? 'warning' : 'primary'}
                onPress={() => navigation.navigate('AdminBookingsTab')}
              />
            </>
          ) : null}
        </View>
        <View style={[styles.statsRow, rowStyle]}>
          {canViewPatients ? (
            <StatCard
              label={ad.pendingPatients || 'Pending patients'}
              value={String(pendingPatients)}
              icon="account-outline"
              tone={pendingPatients > 0 ? 'warning' : 'primary'}
              onPress={() => navigation.navigate('AdminUsersTab', { initialTab: 'patients' })}
            />
          ) : null}
          {canViewProviders ? (
            <StatCard
              label={ad.pendingProviders || 'Pending providers'}
              value={String(pendingProviders)}
              icon="stethoscope"
              tone={pendingProviders > 0 ? 'warning' : 'primary'}
              onPress={() => navigation.navigate('AdminUsersTab', { initialTab: 'providers' })}
            />
          ) : null}
        </View>

        <SectionHeader title={ad.quickAccess || 'Quick access'} />
        <AppCard padding={SPACING.lg}>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <View key={action.key} style={styles.actionCell}>
                <QuickAction
                  vectorIcon={action.vectorIcon}
                  label={action.label}
                  badge={action.badge}
                  onPress={action.onPress}
                  labelLines={2}
                />
              </View>
            ))}
          </View>
        </AppCard>

        <AppCard muted padding={SPACING.md} style={styles.webHint}>
          <AppText variant="caption" color={COLORS.textSecondary}>
            {ad.webHint || 'Advanced settings, financial reports, and clinical audit remain on the admin website.'}
          </AppText>
        </AppCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg },
  heroCard: { marginBottom: SPACING.lg, ...SHADOWS.sm },
  heroTitle: { marginTop: SPACING.sm, marginBottom: SPACING.xs },
  statsRow: { gap: SPACING.md, marginBottom: SPACING.md },
  statWrap: { flex: 1 },
  statCard: { borderWidth: 1 },
  statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  statIcon: { width: 32, height: 32, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -SPACING.xs },
  actionCell: { width: '33.33%', padding: SPACING.xs },
  webHint: { marginTop: SPACING.lg },
});

export default AdminHomeScreen;
