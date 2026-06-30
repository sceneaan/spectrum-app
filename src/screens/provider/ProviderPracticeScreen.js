import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import moment from 'moment';
import Header from '../../components/Header';
import AppIcon from '../../components/ui/AppIcon';
import { AppText, AppCard, SegmentedTabs, EmptyState } from '../../components/ui';
import ProviderStatusBadge from '../../components/provider/ProviderStatusBadge';
import { useLanguage } from '../../store/LanguageContext';
import { useGetIncomingReferrals, useGetOutgoingReferrals } from '../../api/services/Referral.Service';
import { useGetProviderReports } from '../../api/services/MedicalReports.Service';
import { useGetProviderEncountersAll } from '../../api/services/Encounter.Service';
import { getPatientDisplayName } from '../../utils/providerAppointments';
import { formatPersonName } from '../../utils/displayName';
import { isRTL } from '../../utils/rtlUtils';
import COLORS from '../../constants/colors';
import ICONS from '../../constants/icons';
import { SPACING, RADIUS, SHADOWS, cardBorder } from '../../theme';
import useGlassTabBarInset from '../../navigation/useGlassTabBarInset';

const TAB_KEYS = ['referrals', 'reports', 'encounters'];

const isUrgent = (value) => {
  const key = String(value || '').toLowerCase();
  return key === 'urgent' || key === 'high' || key === 'emergency';
};

const ProviderPracticeScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const pd = t.providerDashboard || {};
  const rtl = isRTL();
  const rowStyle = { flexDirection: rtl ? 'row-reverse' : 'row' };
  const tabBarInset = useGlassTabBarInset();
  const [activeTab, setActiveTab] = useState('referrals');
  const [referralDirection, setReferralDirection] = useState('incoming');

  const {
    data: referralData,
    isLoading: referralsLoading,
    refetch: refetchReferrals,
    isRefetching: referralsRefreshing,
  } = useGetIncomingReferrals({ page: 1, limit: 30 });

  const {
    data: reportsData,
    isLoading: reportsLoading,
    refetch: refetchReports,
    isRefetching: reportsRefreshing,
  } = useGetProviderReports({ page: 1, limit: 30 });

  const {
    data: encountersData,
    isLoading: encountersLoading,
    refetch: refetchEncounters,
    isRefetching: encountersRefreshing,
  } = useGetProviderEncountersAll({ page: 1, limit: 30 });

  const {
    data: outgoingData,
    isLoading: outgoingLoading,
    refetch: refetchOutgoing,
    isRefetching: outgoingRefreshing,
  } = useGetOutgoingReferrals({ page: 1, limit: 30 });

  const referrals = referralData?.docs || [];
  const outgoingReferrals = outgoingData?.docs || [];
  const reports = reportsData?.docs || [];
  const encounters = encountersData?.encounters || [];

  const pendingReferrals = useMemo(
    () => referrals.filter((item) => String(item.status || '').toLowerCase() === 'pending').length,
    [referrals],
  );

  const tabs = [
    { key: 'referrals', label: pd.referrals || 'Referrals', count: referrals.length },
    { key: 'reports', label: pd.reports || 'Reports', count: reports.length },
    { key: 'encounters', label: pd.encounters || 'Encounters', count: encounters.length },
  ];

  const isLoading = activeTab === 'referrals'
    ? (referralDirection === 'incoming' ? referralsLoading : outgoingLoading)
    : activeTab === 'reports'
      ? reportsLoading
      : encountersLoading;

  const isRefreshing = activeTab === 'referrals'
    ? (referralDirection === 'incoming' ? referralsRefreshing : outgoingRefreshing)
    : activeTab === 'reports'
      ? reportsRefreshing
      : encountersRefreshing;

  const onRefresh = () => {
    refetchReferrals();
    refetchOutgoing();
    refetchReports();
    refetchEncounters();
  };

  const activeReferrals = referralDirection === 'incoming' ? referrals : outgoingReferrals;

  const listData = useMemo(() => {
    if (activeTab === 'referrals') return activeReferrals;
    if (activeTab === 'reports') return reports;
    return encounters;
  }, [activeTab, activeReferrals, reports, encounters]);

  const sectionSubtitle = useMemo(() => {
    if (activeTab === 'referrals') {
      if (!referrals.length) return pd.referralsEmptyHint || 'Incoming patient referrals appear here';
      if (pendingReferrals > 0) {
        return (pd.referralsPendingSummary || '{{count}} total · {{pending}} need review')
          .replace('{{count}}', String(referrals.length))
          .replace('{{pending}}', String(pendingReferrals));
      }
      return (pd.referralsSummary || '{{count}} referrals').replace('{{count}}', String(referrals.length));
    }
    if (activeTab === 'reports') {
      return reports.length
        ? (pd.reportsSummary || '{{count}} reports').replace('{{count}}', String(reports.length))
        : (pd.reportsEmptyHint || 'Medical reports from your patients');
    }
    return encounters.length
      ? (pd.encountersSummary || '{{count}} encounters').replace('{{count}}', String(encounters.length))
      : (pd.encountersEmptyHint || 'Open clinical encounters');
  }, [activeTab, referrals.length, reports.length, encounters.length, pendingReferrals, pd]);

  const showReportDetail = (item) => {
    navigation.navigate('ProviderReportDetail', {
      reportId: item._id || item.id,
      report: item,
    });
  };

  const showEncounterDetail = (item) => {
    navigation.navigate('ProviderEncounterDetail', {
      encounterId: item._id || item.id,
      encounter: item,
    });
  };

  const PatientAvatar = ({ patient }) => {
    const source = patient?.profileImage
      ? { uri: patient.profileImage }
      : ICONS.defaultAvatar;
    return (
      <View style={[styles.avatarRing, rtl ? styles.avatarRtl : styles.avatarLtr]}>
        <Image source={source} style={styles.avatar} />
      </View>
    );
  };

  const MetaLine = ({ icon, text }) => {
    if (!text) return null;
    return (
      <View style={[styles.metaLine, rowStyle]}>
        <AppIcon name={icon} size={14} color={COLORS.textSecondary} />
        <AppText variant="caption" color={COLORS.textSecondary} numberOfLines={1} style={styles.metaText}>
          {text}
        </AppText>
      </View>
    );
  };

  const UrgencyChip = ({ urgency }) => {
    if (!urgency) return null;
    const urgent = isUrgent(urgency);
    return (
      <View style={[styles.urgencyChip, urgent && styles.urgencyChipHot, rowStyle]}>
        <AppIcon
          name={urgent ? 'alert-circle-outline' : 'clock-outline'}
          size={12}
          color={urgent ? COLORS.danger : COLORS.textSecondary}
        />
        <AppText
          variant="caption"
          color={urgent ? COLORS.danger : COLORS.textSecondary}
          style={styles.urgencyText}
        >
          {formatPersonName(urgency) || urgency}
        </AppText>
      </View>
    );
  };

  const PracticeCard = ({ onPress, avatarPatient, children }) => (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress}>
      <AppCard style={styles.card} padding={SPACING.lg}>
        <View style={[styles.cardInner, rowStyle]}>
          {avatarPatient ? <PatientAvatar patient={avatarPatient} /> : null}
          <View style={styles.cardContent}>{children}</View>
          <AppIcon
            name={rtl ? 'chevron-left' : 'chevron-right'}
            size={18}
            color={COLORS.gray500}
          />
        </View>
      </AppCard>
    </TouchableOpacity>
  );

  const renderReferral = ({ item }) => {
    const patient = item.patient || item.patientDetails;
    const patientName = getPatientDisplayName(patient, rtl) || pd.patient;
    const fromDoctor = referralDirection === 'incoming'
      ? (formatPersonName(item.referredBy?.fullName) || pd.referringDoctor || 'Referring doctor')
      : (formatPersonName(item.referredTo?.fullName) || pd.referredTo || 'Referred to');
    const metaLabel = referralDirection === 'incoming'
      ? (pd.referredBy || 'Referred by')
      : (pd.referredTo || 'Referred to');
    const dateLabel = item.createdAt ? moment(item.createdAt).format('MMM D, YYYY') : '';

    return (
      <PracticeCard
        avatarPatient={patient}
        onPress={() => navigation.navigate('ProviderReferralDetail', { referralId: item._id || item.id })}
      >
        <View style={[styles.cardTop, rowStyle]}>
          <AppText variant="bodyMedium" numberOfLines={1} style={styles.title}>
            {patientName}
          </AppText>
          <ProviderStatusBadge status={item.status} />
        </View>
        <MetaLine
          icon="account-arrow-right-outline"
          text={`${metaLabel} ${fromDoctor}`}
        />
        <View style={[styles.metaFooter, rowStyle]}>
          {dateLabel ? <MetaLine icon="calendar-outline" text={dateLabel} /> : null}
          <UrgencyChip urgency={item.urgency} />
        </View>
      </PracticeCard>
    );
  };

  const renderReport = ({ item }) => {
    const patient = item.patient || item.patientDetails;
    const patientName = getPatientDisplayName(patient, rtl) || pd.patient;
    const dateLabel = item.createdAt ? moment(item.createdAt).format('MMM D, YYYY') : '';

    return (
      <PracticeCard avatarPatient={patient} onPress={() => showReportDetail(item)}>
        <View style={[styles.cardTop, rowStyle]}>
          <AppText variant="bodyMedium" numberOfLines={1} style={styles.title}>
            {item.type || pd.report}
          </AppText>
          <ProviderStatusBadge status={item.status} />
        </View>
        <MetaLine icon="account-outline" text={patientName} />
        {dateLabel ? <MetaLine icon="calendar-outline" text={dateLabel} /> : null}
      </PracticeCard>
    );
  };

  const renderEncounter = ({ item }) => {
    const patient = item.patient || item.patientDetails;
    const patientName = getPatientDisplayName(patient, rtl) || pd.patient;
    const when = item.date
      ? moment(item.date).format('MMM D, YYYY')
      : (item.time || '');

    return (
      <PracticeCard avatarPatient={patient} onPress={() => showEncounterDetail(item)}>
        <View style={[styles.cardTop, rowStyle]}>
          <AppText variant="bodyMedium" numberOfLines={1} style={styles.title}>
            {patientName}
          </AppText>
          <ProviderStatusBadge status={item.status || 'open'} />
        </View>
        <MetaLine icon="stethoscope" text={item.type || pd.encounter} />
        {when ? <MetaLine icon="calendar-outline" text={when} /> : null}
      </PracticeCard>
    );
  };

  const renderItem = ({ item }) => {
    if (activeTab === 'referrals') return renderReferral({ item });
    if (activeTab === 'reports') return renderReport({ item });
    return renderEncounter({ item });
  };

  const emptyMessage = activeTab === 'referrals'
    ? (pd.noReferrals || 'No incoming referrals')
    : activeTab === 'reports'
      ? (pd.noReports || 'No medical reports')
      : (pd.noEncounters || 'No open encounters');

  const activeTabLabel = tabs.find((tab) => tab.key === activeTab)?.label || '';

  const ListHeader = () => (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionTitleRow, rowStyle]}>
        <AppText variant="h3">{activeTabLabel}</AppText>
        {listData.length > 0 ? (
          <View style={styles.countPill}>
            <AppText variant="caption" color={COLORS.primaryDark} style={styles.countText}>
              {listData.length}
            </AppText>
          </View>
        ) : null}
      </View>
      <AppText variant="bodySmall" color={COLORS.textSecondary}>
        {sectionSubtitle}
      </AppText>
      {activeTab === 'referrals' ? (
        <View style={[styles.directionRow, rowStyle]}>
          {['incoming', 'outgoing'].map((dir) => (
            <TouchableOpacity
              key={dir}
              style={[styles.directionChip, referralDirection === dir && styles.directionChipActive]}
              onPress={() => setReferralDirection(dir)}
            >
              <AppText
                variant="caption"
                color={referralDirection === dir ? COLORS.primaryDark : COLORS.textSecondary}
                style={styles.directionText}
              >
                {dir === 'incoming' ? (pd.referralIncoming || 'Incoming') : (pd.referralOutgoing || 'Outgoing')}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title={pd.practiceTitle || 'Practice'} showProfile />
      <View style={styles.tabsWrap}>
        <SegmentedTabs
          isRTL={rtl}
          activeKey={activeTab}
          onChange={setActiveTab}
          options={tabs}
          style={styles.tabs}
        />
      </View>
      {isLoading && !listData.length ? (
        <View style={styles.loader}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => String(item._id || item.id)}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: tabBarInset },
            listData.length === 0 && styles.listEmpty,
          ]}
          ListHeaderComponent={ListHeader}
          refreshControl={(
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          )}
          ListEmptyComponent={(
            <EmptyState
              icon={ICONS.report}
              title={emptyMessage}
              subtitle={pd.practiceEmptyHint || 'Pull to refresh'}
            />
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabsWrap: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.sm },
  tabs: { marginBottom: SPACING.md },
  sectionHeader: {
    marginBottom: SPACING.lg,
  },
  sectionTitleRow: {
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  countPill: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
    minWidth: 28,
    alignItems: 'center',
  },
  countText: { fontWeight: '700' },
  list: { padding: SPACING.lg },
  listEmpty: { flexGrow: 1 },
  card: {
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
    ...cardBorder,
  },
  cardInner: { alignItems: 'center' },
  cardContent: { flex: 1, minWidth: 0 },
  cardTop: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  title: { flex: 1 },
  avatarRing: {
    padding: 2,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryLight,
  },
  avatarLtr: { marginRight: SPACING.md },
  avatarRtl: { marginLeft: SPACING.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.gray200,
  },
  metaLine: {
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  metaText: { flex: 1 },
  metaFooter: {
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  urgencyChip: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceMuted,
  },
  urgencyChipHot: {
    backgroundColor: '#FEE2E2',
  },
  urgencyText: { fontWeight: '600', textTransform: 'capitalize' },
  directionRow: { gap: SPACING.sm, marginTop: SPACING.md, flexWrap: 'wrap' },
  directionChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceMuted,
  },
  directionChipActive: { backgroundColor: COLORS.primaryLight },
  directionText: { fontWeight: '600' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default ProviderPracticeScreen;
