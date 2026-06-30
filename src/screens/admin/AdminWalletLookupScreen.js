import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Header from '../../components/Header';
import RiyalText from '../../components/RiyalText';
import { AppText, AppCard, EmptyState } from '../../components/ui';
import { useLanguage } from '../../store/LanguageContext';
import { useAuthStore } from '../../store/authStore';
import { useGetUserData } from '../../api/services/User.Service';
import { hasAdminPermission } from '../../utils/adminPermissions';
import { useAdminGetPatients, useAdminGetUserWallet } from '../../api/services/Admin.Service';
import { getPatientDisplayName } from '../../utils/providerAppointments';
import { formatSarAmount } from '../../utils/formatMoney';
import COLORS from '../../constants/colors';
import { SPACING, RADIUS } from '../../theme';

const AdminWalletLookupScreen = () => {
  const { t, isRTL } = useLanguage();
  const ad = t.adminDashboard || {};
  const user = useAuthStore((state) => state.user);
  const { data: userData } = useGetUserData();
  const profile = userData || user;
  const canView = hasAdminPermission(profile, 'view_wallets') || hasAdminPermission(profile, 'manage_wallets');
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);

  const patientsQuery = useMemo(() => ({
    page: 1,
    limit: 20,
    search: search.trim(),
    status: 'all',
  }), [search]);

  const { data: patientsData, isLoading: patientsLoading, isError: patientsError, refetch } = useAdminGetPatients(
    patientsQuery,
    { enabled: search.trim().length >= 2 },
  );

  const { data: wallet, isLoading: walletLoading } = useAdminGetUserWallet(selectedUserId, {
    enabled: Boolean(selectedUserId),
  });

  const patients = patientsData?.users || [];
  const balance = wallet?.availableBalance ?? wallet?.balance ?? 0;

  return (
    <View style={styles.container}>
      <Header showBack title={ad.walletLookupTitle || 'Patient wallet'} />
      <View style={styles.searchWrap}>
        <TextInput
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            setSelectedUserId(null);
          }}
          placeholder={ad.walletSearchHint || 'Search patient by name, phone, or email'}
          placeholderTextColor={COLORS.gray500}
          style={styles.searchInput}
        />
      </View>

      {!canView ? (
        <EmptyState title={ad.noPermission || 'You do not have permission to view this'} />
      ) : !selectedUserId ? (
        patientsLoading ? (
          <ActivityIndicator color={COLORS.primary} style={styles.loader} />
        ) : patientsError ? (
          <EmptyState
            title={ad.loadError || 'Could not load data'}
            actionLabel={t.messaging?.retry || t.common?.retry || 'Retry'}
            onAction={refetch}
          />
        ) : search.trim().length < 2 ? (
          <AppText variant="bodySmall" color={COLORS.textSecondary} style={styles.hint} align="center">
            {ad.selectPatientWallet || 'Select a patient to view wallet balance'}
          </AppText>
        ) : (
          <FlatList
            data={patients}
            keyExtractor={(item) => String(item._id || item.id)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const name = getPatientDisplayName(item, isRTL) || item.fullName || ad.patient;
              return (
                <TouchableOpacity onPress={() => setSelectedUserId(item._id || item.id)}>
                  <AppCard style={styles.card} padding={SPACING.lg}>
                    <AppText variant="bodyMedium">{name}</AppText>
                    <AppText variant="caption" color={COLORS.textSecondary}>
                      {[item.phone, item.email].filter(Boolean).join(' · ')}
                    </AppText>
                  </AppCard>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={<EmptyState title={ad.noUsers || 'No users found'} />}
          />
        )
      ) : (
        <View style={styles.walletPanel}>
          <AppCard padding={SPACING.xl}>
            <AppText variant="caption" color={COLORS.textSecondary}>
              {ad.walletBalance || 'Available balance'}
            </AppText>
            {walletLoading ? (
              <ActivityIndicator color={COLORS.primary} style={styles.loader} />
            ) : wallet ? (
              <RiyalText text={formatSarAmount(balance)} textStyle={styles.amount} size={22} />
            ) : (
              <AppText variant="bodySmall" color={COLORS.textSecondary}>
                {ad.noWallet || 'No wallet found for this patient'}
              </AppText>
            )}
          </AppCard>
          <TouchableOpacity onPress={() => setSelectedUserId(null)} style={styles.backLink}>
            <AppText variant="caption" color={COLORS.primaryDark}>
              {t.common?.back || 'Back'}
            </AppText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchWrap: { padding: SPACING.lg, paddingBottom: SPACING.sm },
  searchInput: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.textPrimary,
  },
  list: { padding: SPACING.lg, paddingBottom: 40 },
  card: { marginBottom: SPACING.md },
  loader: { marginTop: SPACING.xxl },
  hint: { padding: SPACING.xl },
  walletPanel: { padding: SPACING.lg },
  amount: { marginTop: SPACING.sm, fontWeight: '700' },
  backLink: { marginTop: SPACING.lg, alignSelf: 'flex-start' },
});

export default AdminWalletLookupScreen;
