import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import moment from 'moment';
import Header from '../../components/Header';
import AppIcon from '../../components/ui/AppIcon';
import { AppText, AppCard, EmptyState, SectionHeader } from '../../components/ui';
import { useLanguage } from '../../store/LanguageContext';
import { useAuthStore } from '../../store/authStore';
import { useGetUserData } from '../../api/services/User.Service';
import { hasAdminPermission } from '../../utils/adminPermissions';
import { useAdminGetTransactions } from '../../api/services/Admin.Service';
import { formatSarAmount } from '../../utils/formatMoney';
import { getPatientDisplayName } from '../../utils/providerAppointments';
import COLORS from '../../constants/colors';
import { SPACING, RADIUS } from '../../theme';

const HubLink = ({ icon, label, subtitle, onPress, rowStyle }) => (
  <TouchableOpacity activeOpacity={0.88} onPress={onPress}>
    <AppCard padding={SPACING.lg} style={styles.hubCard}>
      <View style={[rowStyle, styles.hubRow]}>
        <View style={styles.hubIcon}>
          <AppIcon name={icon} size={18} color={COLORS.primaryDark} />
        </View>
        <View style={styles.hubBody}>
          <AppText variant="bodyMedium">{label}</AppText>
          {subtitle ? (
            <AppText variant="caption" color={COLORS.textSecondary}>{subtitle}</AppText>
          ) : null}
        </View>
        <AppIcon name="chevron-right" size={16} color={COLORS.gray500} />
      </View>
    </AppCard>
  </TouchableOpacity>
);

const AdminFinancialScreen = () => {
  const navigation = useNavigation();
  const { t, isRTL } = useLanguage();
  const ad = t.adminDashboard || {};
  const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
  const user = useAuthStore((state) => state.user);
  const { data: userData } = useGetUserData();
  const profile = userData || user;

  const canViewTransactions = hasAdminPermission(profile, 'view_transactions');
  const canViewRefunds = hasAdminPermission(profile, 'view_refunds');
  const canViewWallets = hasAdminPermission(profile, 'view_wallets') || hasAdminPermission(profile, 'manage_wallets');

  const [page, setPage] = useState(1);
  const [allTransactions, setAllTransactions] = useState([]);

  const { data, isLoading, isError, refetch, isRefetching, isFetching } = useAdminGetTransactions(
    { page, limit: 20 },
  );

  const hasMore = (data?.pagination?.currentPage || 1) < (data?.pagination?.totalPages || 1);

  useEffect(() => {
    const pageItems = data?.transactions || [];
    if (page === 1) {
      setAllTransactions(pageItems);
      return;
    }
    if (pageItems.length === 0) return;
    setAllTransactions((prev) => {
      const ids = new Set(prev.map((item) => String(item._id)));
      const next = pageItems.filter((item) => !ids.has(String(item._id)));
      return [...prev, ...next];
    });
  }, [data?.transactions, page]);

  const handleRefresh = useCallback(() => {
    setPage(1);
  }, []);

  const renderTransaction = ({ item }) => {
    const patientName = getPatientDisplayName(item.patient, isRTL) || ad.patient || 'Patient';
    return (
      <AppCard style={styles.txCard} padding={SPACING.lg}>
        <View style={[rowStyle, styles.txTop]}>
          <AppText variant="bodyMedium" numberOfLines={1} style={styles.txName}>{patientName}</AppText>
          <AppText variant="bodySmall" color={COLORS.primaryDark}>{formatSarAmount(item.amount)}</AppText>
        </View>
        <AppText variant="caption" color={COLORS.textSecondary}>{item.serviceName || item.slug || '—'}</AppText>
        <View style={[rowStyle, styles.txMeta]}>
          <AppText variant="caption" color={COLORS.textSecondary}>{item.status}</AppText>
          {item.createdAt ? (
            <AppText variant="caption" color={COLORS.textSecondary}>
              {moment(item.createdAt).format('MMM D, YYYY')}
            </AppText>
          ) : null}
        </View>
      </AppCard>
    );
  };

  return (
    <View style={styles.container}>
      <Header showBack title={ad.financialHubTitle || 'Financial hub'} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching && page === 1} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
      >
        <SectionHeader title={ad.financialTools || 'Tools'} />
        {canViewRefunds ? (
          <HubLink
            icon="wallet"
            label={ad.refundsTitle || 'Refund history'}
            subtitle={ad.refundsHint || 'Review processed refunds'}
            onPress={() => navigation.navigate('AdminRefunds')}
            rowStyle={rowStyle}
          />
        ) : null}
        {canViewWallets ? (
          <HubLink
            icon="wallet"
            label={ad.walletLookupTitle || 'Patient wallet'}
            subtitle={ad.walletLookupHint || 'Look up wallet balance'}
            onPress={() => navigation.navigate('AdminWalletLookup')}
            rowStyle={rowStyle}
          />
        ) : null}

        {canViewTransactions ? (
          <>
            <SectionHeader title={ad.recentTransactions || 'Recent transactions'} style={styles.sectionGap} />
            {isLoading && page === 1 ? (
              <ActivityIndicator color={COLORS.primary} style={styles.loader} />
            ) : isError ? (
              <EmptyState
                title={ad.loadError || 'Could not load data'}
                actionLabel={t.common?.retry || 'Retry'}
                onAction={() => refetch()}
              />
            ) : (
              <FlatList
                data={allTransactions}
                keyExtractor={(item) => String(item._id)}
                renderItem={renderTransaction}
                scrollEnabled={false}
                ListEmptyComponent={<EmptyState title={ad.noTransactions || 'No transactions yet'} />}
                ListFooterComponent={
                  hasMore ? (
                    <TouchableOpacity
                      style={styles.loadMore}
                      onPress={() => setPage((p) => p + 1)}
                      disabled={isFetching}
                    >
                      {isFetching ? (
                        <ActivityIndicator color={COLORS.primary} />
                      ) : (
                        <AppText variant="bodySmall" color={COLORS.primary}>{t.common?.loadMore || 'Load more'}</AppText>
                      )}
                    </TouchableOpacity>
                  ) : null
                }
              />
            )}
          </>
        ) : (
          <AppCard padding={SPACING.lg} style={styles.sectionGap}>
            <AppText variant="bodySmall" color={COLORS.textSecondary}>
              {ad.financialWebHint || 'Advanced financial reports remain on the admin website.'}
            </AppText>
          </AppCard>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  hubCard: { marginBottom: SPACING.sm },
  hubRow: { alignItems: 'center', gap: SPACING.md },
  hubIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubBody: { flex: 1, minWidth: 0 },
  sectionGap: { marginTop: SPACING.lg },
  loader: { marginVertical: SPACING.lg },
  txCard: { marginBottom: SPACING.sm },
  txTop: { justifyContent: 'space-between', alignItems: 'center', gap: SPACING.sm },
  txName: { flex: 1 },
  txMeta: { justifyContent: 'space-between', marginTop: 4 },
  loadMore: { alignItems: 'center', paddingVertical: SPACING.lg },
});

export default AdminFinancialScreen;
