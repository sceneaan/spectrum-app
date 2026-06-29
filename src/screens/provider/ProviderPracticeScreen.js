import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import moment from 'moment';
import Header from '../../components/Header';
import AppIcon from '../../components/ui/AppIcon';
import { AppText, AppCard, SegmentedTabs, EmptyState } from '../../components/ui';
import ProviderStatusBadge from '../../components/provider/ProviderStatusBadge';
import { useLanguage } from '../../store/LanguageContext';
import { useGetIncomingReferrals } from '../../api/services/Referral.Service';
import { useGetProviderReports } from '../../api/services/MedicalReports.Service';
import { useGetProviderEncountersAll } from '../../api/services/Encounter.Service';
import { getPatientDisplayName } from '../../utils/providerAppointments';
import { formatPersonName } from '../../utils/displayName';
import { isRTL } from '../../utils/rtlUtils';
import COLORS from '../../constants/colors';
import ICONS from '../../constants/icons';
import { SPACING, SHADOWS, cardBorder } from '../../theme';

const TAB_KEYS = ['referrals', 'reports', 'encounters'];

const ProviderPracticeScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const pd = t.providerDashboard || {};
  const rtl = isRTL();
  const rowStyle = { flexDirection: rtl ? 'row-reverse' : 'row' };
  const [activeTab, setActiveTab] = useState('referrals');

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

  const referrals = referralData?.docs || [];
  const reports = reportsData?.docs || [];
  const encounters = encountersData?.encounters || [];

  const tabs = [
    { key: 'referrals', label: pd.referrals || 'Referrals' },
    { key: 'reports', label: pd.reports || 'Reports' },
    { key: 'encounters', label: pd.encounters || 'Encounters' },
  ];

  const isLoading = activeTab === 'referrals'
    ? referralsLoading
    : activeTab === 'reports'
      ? reportsLoading
      : encountersLoading;

  const isRefreshing = activeTab === 'referrals'
    ? referralsRefreshing
    : activeTab === 'reports'
      ? reportsRefreshing
      : encountersRefreshing;

  const onRefresh = () => {
    refetchReferrals();
    refetchReports();
    refetchEncounters();
  };

  const listData = useMemo(() => {
    if (activeTab === 'referrals') return referrals;
    if (activeTab === 'reports') return reports;
    return encounters;
  }, [activeTab, referrals, reports, encounters]);

  const showEncounterDetail = (item) => {
    const patientName = getPatientDisplayName(item.patient, rtl) || pd.patient;
    Alert.alert(
      patientName,
      [
        item.type ? `${pd.encounterType || 'Type'}: ${item.type}` : null,
        item.status ? `${pd.status || 'Status'}: ${item.status}` : null,
        item.date ? `${pd.date || 'Date'}: ${moment(item.date).format('MMM D, YYYY')}` : null,
        item.chiefComplaint ? `${pd.chiefComplaint || 'Chief complaint'}: ${item.chiefComplaint}` : null,
        pd.encounterWebHint || 'Full encounter editing is available on the clinic website.',
      ].filter(Boolean).join('\n\n'),
    );
  };

  const showReportDetail = (item) => {
    const patientName = getPatientDisplayName(item.patient, rtl) || pd.patient;
    Alert.alert(
      item.type || pd.report || 'Report',
      [
        `${pd.patient || 'Patient'}: ${patientName}`,
        `${pd.status || 'Status'}: ${item.status || '—'}`,
        item.createdAt ? moment(item.createdAt).format('MMM D, YYYY') : null,
        item.report ? item.report.slice(0, 280) : null,
      ].filter(Boolean).join('\n\n'),
    );
  };

  const PracticeCard = ({ onPress, children }) => (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress}>
      <AppCard style={styles.card} padding={SPACING.lg}>
        <View style={[styles.cardInner, rowStyle]}>
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
    const patientName = getPatientDisplayName(item.patient, rtl) || pd.patient;
    const fromDoctor = formatPersonName(item.referredBy?.fullName) || pd.referringDoctor || 'Referring doctor';
    return (
      <PracticeCard onPress={() => navigation.navigate('ProviderReferralDetail', { referralId: item._id || item.id })}>
        <View style={[styles.cardTop, rowStyle]}>
          <AppText variant="bodyMedium" numberOfLines={1} style={styles.title}>
            {patientName}
          </AppText>
          <ProviderStatusBadge status={item.status} />
        </View>
        <AppText variant="caption" color={COLORS.textSecondary} numberOfLines={1}>
          {pd.referredBy || 'Referred by'}: {fromDoctor}
        </AppText>
        {item.urgency ? (
          <AppText variant="caption" color={COLORS.textSecondary}>
            {pd.urgency || 'Urgency'}: {item.urgency}
          </AppText>
        ) : null}
        {item.createdAt ? (
          <AppText variant="caption" color={COLORS.textSecondary}>
            {moment(item.createdAt).format('MMM D, YYYY')}
          </AppText>
        ) : null}
      </PracticeCard>
    );
  };

  const renderReport = ({ item }) => {
    const patientName = getPatientDisplayName(item.patient, rtl) || pd.patient;
    return (
      <PracticeCard onPress={() => showReportDetail(item)}>
        <View style={[styles.cardTop, rowStyle]}>
          <AppText variant="bodyMedium" numberOfLines={1} style={styles.title}>
            {item.type || pd.report}
          </AppText>
          <ProviderStatusBadge status={item.status} />
        </View>
        <AppText variant="caption" color={COLORS.textSecondary} numberOfLines={1}>
          {patientName}
        </AppText>
        {item.createdAt ? (
          <AppText variant="caption" color={COLORS.textSecondary}>
            {moment(item.createdAt).format('MMM D, YYYY')}
          </AppText>
        ) : null}
      </PracticeCard>
    );
  };

  const renderEncounter = ({ item }) => {
    const patientName = getPatientDisplayName(item.patient, rtl) || pd.patient;
    const when = item.date
      ? moment(item.date).format('MMM D, YYYY')
      : (item.time || '');
    return (
      <PracticeCard onPress={() => showEncounterDetail(item)}>
        <View style={[styles.cardTop, rowStyle]}>
          <AppText variant="bodyMedium" numberOfLines={1} style={styles.title}>
            {patientName}
          </AppText>
          <ProviderStatusBadge status={item.status || 'open'} />
        </View>
        <AppText variant="caption" color={COLORS.textSecondary}>
          {item.type || pd.encounter}
        </AppText>
        {when ? (
          <AppText variant="caption" color={COLORS.textSecondary}>{when}</AppText>
        ) : null}
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

  return (
    <View style={styles.container}>
      <Header title={pd.practiceTitle || 'Practice'} showProfile />
      <View style={styles.tabsWrap}>
        <SegmentedTabs
          isRTL={rtl}
          activeKey={activeTab}
          onChange={setActiveTab}
          options={tabs}
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
          contentContainerStyle={styles.list}
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
  tabsWrap: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  list: { padding: SPACING.lg, paddingBottom: 100 },
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
    marginBottom: SPACING.xs,
  },
  title: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default ProviderPracticeScreen;
