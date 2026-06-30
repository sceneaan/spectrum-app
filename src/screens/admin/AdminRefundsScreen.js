import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import moment from 'moment';
import Header from '../../components/Header';
import ProviderStatusBadge from '../../components/provider/ProviderStatusBadge';
import { AppText, AppCard, EmptyState } from '../../components/ui';
import { useLanguage } from '../../store/LanguageContext';
import { useAuthStore } from '../../store/authStore';
import { useGetUserData } from '../../api/services/User.Service';
import { hasAdminPermission } from '../../utils/adminPermissions';
import { useAdminListRefunds } from '../../api/services/Admin.Service';
import { formatSarAmount } from '../../utils/formatMoney';
import { getPatientDisplayName } from '../../utils/providerAppointments';
import COLORS from '../../constants/colors';
import { SPACING } from '../../theme';

const AdminRefundsScreen = () => {
  const { t, isRTL } = useLanguage();
  const ad = t.adminDashboard || {};
  const user = useAuthStore((state) => state.user);
  const { data: userData } = useGetUserData();
  const profile = userData || user;
  const canView = hasAdminPermission(profile, 'view_refunds');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch, isRefetching } = useAdminListRefunds({ page, limit: 30 });
  const refunds = data?.refunds || [];
  const hasMore = (data?.pagination?.currentPage || 1) < (data?.pagination?.totalPages || 1);

  const renderItem = ({ item }) => {
    const patient = item.transaction?.patient;
    const patientName = getPatientDisplayName(patient, isRTL) || ad.patient || 'Patient';
    const amount = item.amount ?? item.refundAmount ?? item.transaction?.amount;

    return (
      <AppCard style={styles.card} padding={SPACING.lg}>
        <View style={styles.top}>
          <AppText variant="bodyMedium">{patientName}</AppText>
          <ProviderStatusBadge status={item.status || 'processed'} />
        </View>
        <AppText variant="bodySmall" color={COLORS.primaryDark}>
          {formatSarAmount(amount)}
        </AppText>
        {item.createdAt ? (
          <AppText variant="caption" color={COLORS.textSecondary}>
            {moment(item.createdAt).format('MMM D, YYYY h:mm A')}
          </AppText>
        ) : null}
        {item.slug ? (
          <AppText variant="caption" color={COLORS.textSecondary}>{item.slug}</AppText>
        ) : null}
      </AppCard>
    );
  };

  return (
    <View style={styles.container}>
      <Header showBack title={ad.refundsTitle || 'Refund history'} />
      {!canView ? (
        <EmptyState title={ad.noPermission || 'You do not have permission to view this'} />
      ) : isLoading && !refunds.length ? (
        <ActivityIndicator color={COLORS.primary} style={styles.loader} />
      ) : isError ? (
        <EmptyState
          title={ad.loadError || 'Could not load data'}
          actionLabel={t.messaging?.retry || t.common?.retry || 'Retry'}
          onAction={refetch}
        />
      ) : (
        <FlatList
          data={refunds}
          keyExtractor={(item) => String(item._id || item.id || item.slug)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          onEndReached={() => {
            if (hasMore && !isRefetching) setPage((p) => p + 1);
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<EmptyState title={ad.noRefunds || 'No refunds found'} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: SPACING.lg, paddingBottom: 40 },
  loader: { marginTop: SPACING.xxl },
  card: { marginBottom: SPACING.md },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm, marginBottom: SPACING.xs },
});

export default AdminRefundsScreen;
