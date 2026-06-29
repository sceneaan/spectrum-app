import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import moment from 'moment';
import Header from '../../components/Header';
import AppIcon from '../../components/ui/AppIcon';
import ProviderRefillModal from '../../components/provider/ProviderRefillModal';
import ProviderStatusBadge from '../../components/provider/ProviderStatusBadge';
import { AppText, AppCard, EmptyState, SegmentedTabs } from '../../components/ui';
import { useLanguage } from '../../store/LanguageContext';
import { usePatientToProviderRequests } from '../../api/services/Refill.Service';
import { getPatientDisplayName } from '../../utils/providerAppointments';
import { isRTL } from '../../utils/rtlUtils';
import COLORS from '../../constants/colors';
import ICONS from '../../constants/icons';
import { SPACING, RADIUS } from '../../theme';

const ProviderRefillsScreen = () => {
  const { t, isRTL: rtlFromContext } = useLanguage();
  const pd = t.providerDashboard || {};
  const rtl = isRTL();
  const [selectedRefill, setSelectedRefill] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');

  const { data, isLoading, isError, refetch, isRefetching } = usePatientToProviderRequests();

  const allRequests = useMemo(() => data?.docs || data || [], [data]);

  const requests = useMemo(() => {
    if (activeTab === 'all') return allRequests;
    return allRequests.filter((r) => String(r.status || '').toLowerCase() === 'pending');
  }, [allRequests, activeTab]);

  const tabs = [
    { key: 'pending', label: pd.refillsPending || 'Pending' },
    { key: 'all', label: pd.refillsAll || 'All' },
  ];

  const renderItem = ({ item }) => {
    const patient = item.patient || item.patientDetails;
    const patientName = getPatientDisplayName(patient, rtlFromContext) || pd.patient || 'Patient';
    const medCount = item.medications?.length || 0;
    const firstMed = item.medications?.[0]?.drugName;
    const requestedAt = item.createdAt ? moment(item.createdAt).format('MMM D, YYYY') : '';
    const rowStyle = { flexDirection: rtl ? 'row-reverse' : 'row' };

    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => setSelectedRefill(item)}>
        <AppCard style={styles.card} padding={SPACING.lg}>
          <View style={[styles.topRow, rowStyle]}>
            <View style={styles.titleBlock}>
              <AppText variant="bodyMedium" numberOfLines={1}>{patientName}</AppText>
              <AppText variant="caption" color={COLORS.textSecondary}>
                {requestedAt}
              </AppText>
            </View>
            <ProviderStatusBadge status={item.status || 'Pending'} />
          </View>
          <View style={[styles.medRow, rowStyle]}>
            <View style={styles.medIcon}>
              <AppIcon name="pill" size={16} color={COLORS.primaryDark} />
            </View>
            <View style={styles.medCopy}>
              <AppText variant="bodySmall" numberOfLines={2}>
                {firstMed || pd.medication}
                {medCount > 1 ? ` +${medCount - 1}` : ''}
              </AppText>
              {String(item.status || '').toLowerCase() === 'pending' ? (
                <AppText variant="caption" color={COLORS.primary} style={styles.tapHint}>
                  {pd.tapToReview || 'Tap to review medications'}
                </AppText>
              ) : null}
            </View>
            <AppIcon
              name={rtl ? 'chevron-left' : 'chevron-right'}
              size={18}
              color={COLORS.gray500}
            />
          </View>
        </AppCard>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header showBack title={pd.refillsTitle || 'Pending Refill Requests'} />
      <View style={styles.tabsWrap}>
        <SegmentedTabs isRTL={rtl} activeKey={activeTab} onChange={setActiveTab} options={tabs} />
      </View>
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : isError ? (
        <EmptyState
          title={pd.loadError || 'Could not load refill requests'}
          actionLabel={t.common?.retry || 'Retry'}
          onAction={() => refetch()}
        />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => String(item._id || item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={(
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
          )}
          ListEmptyComponent={(
            <EmptyState
              icon={ICONS.refill}
              title={activeTab === 'pending'
                ? (pd.noRefills || 'No pending refill requests')
                : (pd.noRefillsHistory || 'No refill requests yet')}
              subtitle={pd.noRefillsHint || 'Your refill requests will appear here once submitted'}
            />
          )}
        />
      )}

      <ProviderRefillModal
        visible={Boolean(selectedRefill)}
        refill={selectedRefill}
        onClose={() => setSelectedRefill(null)}
        onUpdated={refetch}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabsWrap: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
  list: { padding: SPACING.lg, paddingBottom: 40 },
  card: { marginBottom: SPACING.md },
  topRow: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  titleBlock: { flex: 1, minWidth: 0 },
  medRow: { alignItems: 'center' },
  medIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: SPACING.md,
  },
  medCopy: { flex: 1, minWidth: 0 },
  tapHint: { marginTop: SPACING.xs, fontWeight: '600' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default ProviderRefillsScreen;
