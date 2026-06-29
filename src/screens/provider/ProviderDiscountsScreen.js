import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { showToast } from '../../components/InAppToast';
import moment from 'moment';
import Header from '../../components/Header';
import { AppText, AppCard, EmptyState, AppButton } from '../../components/ui';
import ProviderStatusBadge from '../../components/provider/ProviderStatusBadge';
import { useLanguage } from '../../store/LanguageContext';
import {
  useGetPendingDiscountInvitations,
  useRespondToDiscountInvitation,
} from '../../api/services/Discount.Service';
import { formatSarAmount } from '../../utils/formatMoney';
import COLORS from '../../constants/colors';
import { SPACING } from '../../theme';

const ProviderDiscountsScreen = () => {
  const { t } = useLanguage();
  const pd = t.providerDashboard || {};

  const { data, isLoading, isError, refetch, isRefetching } = useGetPendingDiscountInvitations();
  const { mutate: respond, isPending } = useRespondToDiscountInvitation();

  const invitations = data || [];

  const handleRespond = (item, status) => {
    const title = status === 'accepted'
      ? (pd.acceptDiscount || 'Accept invitation')
      : (pd.declineDiscount || 'Decline invitation');
    Alert.alert(
      title,
      pd.discountConfirm || 'Update this discount invitation?',
      [
        { text: t.common?.cancel || 'Cancel', style: 'cancel' },
        {
          text: t.common?.confirm || 'Confirm',
          onPress: () => {
            respond(
              { discountId: item.discountId, status },
              {
                onSuccess: () => {
                  showToast({
                    type: 'success',
                    title: t.common?.success || 'Success',
                    message: status === 'accepted'
                      ? (pd.discountAccepted || 'Invitation accepted')
                      : (pd.discountDeclined || 'Invitation declined'),
                  });
                  refetch();
                },
                onError: () => {
                  showToast({
                    type: 'error',
                    title: t.common?.error || 'Error',
                    message: pd.discountFailed || 'Could not update invitation',
                  });
                },
              },
            );
          },
        },
      ],
    );
  };

  const renderItem = ({ item }) => (
    <AppCard style={styles.card} padding={SPACING.lg}>
      <View style={styles.top}>
        <AppText variant="bodyMedium">{item.code}</AppText>
        <ProviderStatusBadge status="pending" label={pd.pending || 'Pending'} />
      </View>
      <AppText variant="caption" color={COLORS.textSecondary}>
        {item.type} · {item.value}{item.type === 'percentage' ? '%' : ` ${formatSarAmount(item.value)}`}
      </AppText>
      {item.expiryDate ? (
        <AppText variant="caption" color={COLORS.textSecondary}>
          {(pd.expires || 'Expires')}: {moment(item.expiryDate).format('MMM D, YYYY')}
        </AppText>
      ) : null}
      <View style={styles.actions}>
        <AppButton
          title={pd.accept || 'Accept'}
          onPress={() => handleRespond(item, 'accepted')}
          disabled={isPending}
          style={styles.btn}
        />
        <AppButton
          title={pd.decline || 'Decline'}
          variant="outline"
          onPress={() => handleRespond(item, 'rejected')}
          disabled={isPending}
          style={styles.btn}
        />
      </View>
    </AppCard>
  );

  return (
    <View style={styles.container}>
      <Header showBack title={pd.discountsTitle || 'Discount invitations'} />
      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={styles.loader} />
      ) : isError ? (
        <EmptyState
          title={pd.loadError || 'Could not load invitations'}
          actionLabel={t.common?.retry || 'Retry'}
          onAction={() => refetch()}
        />
      ) : (
        <FlatList
          data={invitations}
          keyExtractor={(item) => String(item.discountId)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          ListEmptyComponent={(
            <EmptyState
              title={pd.noDiscounts || 'No pending discount invitations'}
              subtitle={pd.noDiscountsHint || 'Admin discount invitations will appear here'}
            />
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: SPACING.lg, paddingBottom: 40 },
  card: { marginBottom: SPACING.md },
  top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  btn: { flex: 1 },
  loader: { marginTop: SPACING.xxl },
});

export default ProviderDiscountsScreen;
