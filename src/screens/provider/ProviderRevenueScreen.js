import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import moment from 'moment';
import Header from '../../components/Header';
import RiyalText from '../../components/RiyalText';
import ProviderBarChart from '../../components/provider/ProviderBarChart';
import { AppText, AppCard, SectionHeader, EmptyState } from '../../components/ui';
import { useLanguage } from '../../store/LanguageContext';
import { useGetProviderEarningStats } from '../../api/services/Stats.Service';
import { useGetProviderTransactions } from '../../api/services/Transaction.Service';
import { useGetProviderPayouts } from '../../api/services/Payout.Service';
import COLORS from '../../constants/colors';
import { SPACING } from '../../theme';

const ProviderRevenueScreen = () => {
  const { t } = useLanguage();
  const pd = t.providerDashboard || {};
  const [txPage] = useState(1);

  const {
    data: earnings,
    isLoading: earningsLoading,
    refetch: refetchEarnings,
    isRefetching,
  } = useGetProviderEarningStats();

  const { data: txData, isLoading: txLoading, refetch: refetchTx } = useGetProviderTransactions({
    page: txPage,
    limit: 8,
  });

  const { data: payoutData, isLoading: payoutLoading, refetch: refetchPayouts } = useGetProviderPayouts({
    page: 1,
    limit: 8,
  });

  const chartLabels = useMemo(
    () => (earnings?.monthlyEarningsTimeline || []).map((item) => item.name),
    [earnings],
  );
  const chartValues = useMemo(
    () => (earnings?.monthlyEarningsTimeline || []).map((item) => Number(item.earnings) || 0),
    [earnings],
  );

  const transactions = txData?.transactions || [];
  const payouts = payoutData?.payouts || [];

  const onRefresh = () => {
    refetchEarnings();
    refetchTx();
    refetchPayouts();
  };

  const loading = earningsLoading && !earnings;

  return (
    <View style={styles.container}>
      <Header showBack title={pd.revenueTitle || 'Revenue & payouts'} />
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={(
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={COLORS.primary} />
          )}
        >
          <View style={styles.statsRow}>
            <AppCard style={styles.statCard} padding={SPACING.lg}>
              <AppText variant="caption" color={COLORS.textSecondary}>{pd.totalEarnings || 'Total earnings'}</AppText>
              <RiyalText text={String(earnings?.totalEarnings ?? 0)} textStyle={styles.statValue} />
            </AppCard>
            <AppCard style={styles.statCard} padding={SPACING.lg}>
              <AppText variant="caption" color={COLORS.textSecondary}>{pd.netRevenue || 'Net revenue'}</AppText>
              <RiyalText text={String(earnings?.netRevenue ?? 0)} textStyle={styles.statValue} />
            </AppCard>
          </View>

          <AppCard style={styles.chartCard}>
            <SectionHeader title={pd.earningsTrend || 'Earnings trend'} />
            <ProviderBarChart
              data={chartValues}
              labels={chartLabels}
              color={COLORS.primary}
              formatValue={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)))}
            />
          </AppCard>

          <SectionHeader title={pd.recentTransactions || 'Recent transactions'} />
          {txLoading && !transactions.length ? (
            <ActivityIndicator color={COLORS.primary} style={styles.inlineLoader} />
          ) : transactions.length === 0 ? (
            <EmptyState title={pd.noTransactions || 'No transactions yet'} />
          ) : (
            transactions.map((item) => (
              <AppCard key={item._id || item.id} style={styles.rowCard}>
                <View style={styles.rowBetween}>
                  <View style={styles.flex}>
                    <AppText variant="bodyMedium">
                      {item.patient?.fullName || item.appointment?.patient?.fullName || pd.patient}
                    </AppText>
                    <AppText variant="caption" color={COLORS.textSecondary}>
                      {item.createdAt ? moment(item.createdAt).format('MMM D, YYYY') : ''}
                      {item.status ? ` · ${item.status}` : ''}
                    </AppText>
                  </View>
                  <RiyalText
                    text={String(item.providerEarnings ?? item.amount ?? 0)}
                    textStyle={styles.amount}
                  />
                </View>
              </AppCard>
            ))
          )}

          <SectionHeader title={pd.payoutHistory || 'Payout history'} />
          {payoutLoading && !payouts.length ? (
            <ActivityIndicator color={COLORS.primary} style={styles.inlineLoader} />
          ) : payouts.length === 0 ? (
            <EmptyState title={pd.noPayouts || 'No payouts yet'} />
          ) : (
            payouts.map((item) => (
              <AppCard key={item._id || item.id} style={styles.rowCard}>
                <View style={styles.rowBetween}>
                  <View style={styles.flex}>
                    <AppText variant="bodyMedium">
                      {item.startDate && item.endDate
                        ? `${moment(item.startDate).format('MMM D')} – ${moment(item.endDate).format('MMM D, YYYY')}`
                        : (pd.payoutPeriod || 'Payout period')}
                    </AppText>
                    <AppText variant="caption" color={COLORS.textSecondary}>
                      {item.status || pd.payoutStatus || 'Status'}
                      {item.createdAt ? ` · ${moment(item.createdAt).format('MMM D, YYYY')}` : ''}
                    </AppText>
                  </View>
                  <RiyalText text={String(item.amount ?? item.totalAmount ?? 0)} textStyle={styles.amount} />
                </View>
              </AppCard>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inlineLoader: { marginVertical: SPACING.lg },
  statsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
  statCard: { flex: 1 },
  statValue: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginTop: SPACING.xs },
  chartCard: { marginBottom: SPACING.xl, padding: SPACING.lg },
  rowCard: { marginBottom: SPACING.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flex: { flex: 1, paddingRight: SPACING.md },
  amount: { fontSize: 16, fontWeight: '700', color: COLORS.primaryDark },
});

export default ProviderRevenueScreen;
