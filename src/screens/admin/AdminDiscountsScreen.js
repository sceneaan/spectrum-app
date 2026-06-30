import React from 'react';
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
import { useAdminListDiscounts } from '../../api/services/Discount.Service';
import COLORS from '../../constants/colors';
import { SPACING } from '../../theme';

const AdminDiscountsScreen = () => {
  const { t } = useLanguage();
  const ad = t.adminDashboard || {};
  const { data, isLoading, isError, refetch, isRefetching } = useAdminListDiscounts();

  const discounts = data?.discounts || data || [];

  return (
    <View style={styles.container}>
      <Header showBack title={ad.discountsTitle || 'Discount codes'} />
      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={styles.loader} />
      ) : isError ? (
        <EmptyState
          title={ad.loadError || 'Could not load discount codes'}
          actionLabel={t.messaging?.retry || t.common?.retry || 'Retry'}
          onAction={refetch}
        />
      ) : (
        <FlatList
          data={discounts}
          keyExtractor={(item) => String(item._id || item.id || item.code)}
          renderItem={({ item }) => (
            <AppCard style={styles.card} padding={SPACING.lg}>
              <View style={styles.row}>
                <AppText variant="bodyMedium" style={styles.flex}>{item.code || item.name}</AppText>
                <ProviderStatusBadge status={item.status || item.isActive ? 'active' : 'inactive'} />
              </View>
              {item.description ? (
                <AppText variant="caption" color={COLORS.textSecondary}>{item.description}</AppText>
              ) : null}
              {item.expiryDate ? (
                <AppText variant="caption" color={COLORS.textSecondary}>
                  {(ad.expires || 'Expires')}: {moment(item.expiryDate).format('MMM D, YYYY')}
                </AppText>
              ) : null}
            </AppCard>
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          ListEmptyComponent={<EmptyState title={ad.noDiscounts || 'No discount codes'} />}
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
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm },
  flex: { flex: 1 },
});

export default AdminDiscountsScreen;
