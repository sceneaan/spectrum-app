import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Header from '../../components/Header';
import ProviderBarChart from '../../components/provider/ProviderBarChart';
import { AppText, AppCard, SegmentedTabs, EmptyState } from '../../components/ui';
import { useLanguage } from '../../store/LanguageContext';
import { useGetProviderPerformanceMetrics, EMPTY_PROVIDER_METRICS } from '../../api/services/Stats.Service';
import COLORS from '../../constants/colors';
import { SPACING } from '../../theme';

const PERIODS = [
  { key: 'Daily', label: 'Daily' },
  { key: 'Weekly', label: 'Weekly' },
  { key: 'Monthly', label: 'Monthly' },
  { key: 'Yearly', label: 'Yearly' },
];

const ProviderPerformanceScreen = () => {
  const { t, isRTL } = useLanguage();
  const pd = t.providerDashboard || {};
  const [period, setPeriod] = useState('Daily');

  const periodOptions = useMemo(() => PERIODS.map((p) => ({
    key: p.key,
    label: pd[`period${p.key}`] || p.label,
  })), [pd]);

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useGetProviderPerformanceMetrics(period);

  const metrics = data || EMPTY_PROVIDER_METRICS;
  const categories = metrics.categories || [];

  const sections = [
    {
      key: 'consultations',
      title: pd.consultations || 'Consultations',
      total: metrics.consultations?.total ?? 0,
      data: metrics.consultations?.data || [],
      color: COLORS.primary,
      suffix: '',
    },
    {
      key: 'satisfaction',
      title: pd.satisfaction || 'Satisfaction',
      total: metrics.satisfaction?.average ?? 0,
      data: metrics.satisfaction?.data || [],
      color: '#9B59B6',
      suffix: '/5',
    },
    {
      key: 'revenue',
      title: pd.performanceRevenue || 'Revenue',
      total: metrics.revenue?.total ?? 0,
      data: metrics.revenue?.data || [],
      color: COLORS.secondary,
      suffix: ` ${metrics.revenue?.currency || 'SAR'}`,
      isMoney: true,
    },
    {
      key: 'punctuality',
      title: pd.punctuality || 'On-time rate',
      total: metrics.punctuality?.average ?? 0,
      data: metrics.punctuality?.data || [],
      color: '#15803D',
      suffix: '%',
    },
    {
      key: 'cancellation',
      title: pd.cancellationRate || 'Cancellation rate',
      total: metrics.cancellationRate?.average ?? 0,
      data: metrics.cancellationRate?.data || [],
      color: COLORS.danger,
      suffix: '%',
    },
  ];

  return (
    <View style={styles.container}>
      <Header showBack title={pd.performanceTitle || 'Performance'} />
      <View style={styles.tabsWrap}>
        <SegmentedTabs
          isRTL={isRTL}
          activeKey={period}
          onChange={setPeriod}
          options={periodOptions}
        />
      </View>

      {isLoading && !data ? (
        <View style={styles.loader}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : isError && !data ? (
        <EmptyState
          title={pd.loadError || 'Could not load performance data'}
          actionLabel={t.messaging?.retry || t.common?.retry || 'Retry'}
          onAction={refetch}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={(
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
          )}
        >
          {sections.map((section) => (
            <AppCard key={section.key} style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <AppText variant="h3">{section.title}</AppText>
                <AppText variant="bodyMedium" color={COLORS.primaryDark}>
                  {section.isMoney
                    ? `${Number(section.total).toFixed(0)}${section.suffix}`
                    : `${Number(section.total).toFixed(section.key === 'satisfaction' ? 1 : 0)}${section.suffix}`}
                </AppText>
              </View>
              <ProviderBarChart
                data={section.data}
                labels={categories}
                color={section.color}
                height={120}
                emptyLabel={pd.chartNoData || 'No data for this period'}
                formatValue={(v) => (
                  section.isMoney
                    ? (v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)))
                    : String(Number(v).toFixed(section.key === 'satisfaction' ? 1 : 0))
                )}
              />
            </AppCard>
          ))}
          <AppText variant="caption" color={COLORS.textSecondary} align="center" style={styles.note}>
            {pd.performanceNote || 'Pull to refresh. Data matches your clinic website.'}
          </AppText>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabsWrap: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.sm },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionCard: { marginBottom: SPACING.lg, padding: SPACING.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  note: { marginTop: SPACING.sm, lineHeight: 20 },
});

export default ProviderPerformanceScreen;
