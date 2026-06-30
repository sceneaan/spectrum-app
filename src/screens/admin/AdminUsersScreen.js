import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import Header from '../../components/Header';
import ProviderStatusBadge from '../../components/provider/ProviderStatusBadge';
import { AppText, AppCard, SegmentedTabs, EmptyState } from '../../components/ui';
import { showToast } from '../../components/InAppToast';
import { useLanguage } from '../../store/LanguageContext';
import { useAuthStore } from '../../store/authStore';
import { useGetUserData } from '../../api/services/User.Service';
import { hasAdminPermission } from '../../utils/adminPermissions';
import {
  useAdminGetPatients,
  useAdminGetProviders,
  useAdminUpdateUserStatus,
} from '../../api/services/Admin.Service';
import { getPatientDisplayName } from '../../utils/providerAppointments';
import COLORS from '../../constants/colors';
import { SPACING, RADIUS } from '../../theme';
import useGlassTabBarInset from '../../navigation/useGlassTabBarInset';

const AdminUsersScreen = ({ showBack = false }) => {
  const route = useRoute();
  const { t, isRTL } = useLanguage();
  const ad = t.adminDashboard || {};
  const user = useAuthStore((state) => state.user);
  const { data: userData } = useGetUserData();
  const profile = userData || user;
  const canEditPatients = hasAdminPermission(profile, 'edit_patients');
  const canEditProviders = hasAdminPermission(profile, 'edit_users') || hasAdminPermission(profile, 'edit_providers');
  const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
  const tabBarInset = useGlassTabBarInset();

  const initialTab = route.params?.initialTab === 'providers' ? 'providers' : 'patients';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [search, setSearch] = useState('');

  const patientsQuery = useMemo(() => ({
    page: 1,
    limit: 40,
    search: search.trim(),
    status: 'all',
  }), [search]);

  const providersQuery = useMemo(() => ({
    page: 1,
    limit: 40,
    search: search.trim(),
    status: 'All',
  }), [search]);

  const patientsEnabled = activeTab === 'patients' && hasAdminPermission(profile, 'view_patients');
  const providersEnabled = activeTab === 'providers' && hasAdminPermission(profile, 'view_providers');

  const {
    data: patientsData,
    isLoading: patientsLoading,
    isError: patientsError,
    refetch: refetchPatients,
    isRefetching: patientsRefreshing,
  } = useAdminGetPatients(patientsQuery, { enabled: patientsEnabled });

  const {
    data: providersData,
    isLoading: providersLoading,
    isError: providersError,
    refetch: refetchProviders,
    isRefetching: providersRefreshing,
  } = useAdminGetProviders(providersQuery, { enabled: providersEnabled });

  const { mutate: updateStatus, isPending: updating } = useAdminUpdateUserStatus();

  const users = activeTab === 'patients'
    ? (patientsData?.users || [])
    : (providersData?.users || []);

  const isLoading = activeTab === 'patients' ? patientsLoading : providersLoading;
  const isError = activeTab === 'patients' ? patientsError : providersError;
  const isRefetching = activeTab === 'patients' ? patientsRefreshing : providersRefreshing;
  const refetch = activeTab === 'patients' ? refetchPatients : refetchProviders;
  const canEdit = activeTab === 'patients' ? canEditPatients : canEditProviders;

  const tabs = [
    { key: 'patients', label: ad.patients || 'Patients' },
    { key: 'providers', label: ad.providers || 'Providers' },
  ];

  const activateUser = (item) => {
    const id = item._id || item.id;
    if (!id) return;
    Alert.alert(
      ad.activateTitle || 'Activate user',
      ad.activateConfirm || 'Set this account to active?',
      [
        { text: t.common?.cancel || 'Cancel', style: 'cancel' },
        {
          text: ad.activate || 'Activate',
          onPress: () => {
            updateStatus(
              { userId: id, status: 'active' },
              {
                onSuccess: () => {
                  showToast({
                    type: 'success',
                    title: t.common?.success || 'Success',
                    message: ad.userUpdated || 'User updated',
                  });
                  refetch();
                },
                onError: () => {
                  showToast({
                    type: 'error',
                    title: t.common?.error || 'Error',
                    message: ad.userUpdateFailed || 'Could not update user',
                  });
                },
              },
            );
          },
        },
      ],
    );
  };

  const renderItem = ({ item }) => {
    const name = getPatientDisplayName(item, isRTL) || item.fullName || item.email || ad.user || 'User';
    const meta = [item.phone, item.email].filter(Boolean).join(' · ');

    return (
      <AppCard style={styles.card} padding={SPACING.lg}>
        <View style={[styles.topRow, rowStyle]}>
          <View style={styles.flex}>
            <AppText variant="bodyMedium">{name}</AppText>
            {meta ? <AppText variant="caption" color={COLORS.textSecondary}>{meta}</AppText> : null}
          </View>
          <ProviderStatusBadge status={item.status} />
        </View>
        {canEdit && item.status === 'pending' ? (
          <TouchableOpacity onPress={() => activateUser(item)} disabled={updating} style={styles.activateBtn}>
            <AppText variant="caption" color={COLORS.primaryDark}>{ad.activate || 'Activate'}</AppText>
          </TouchableOpacity>
        ) : null}
      </AppCard>
    );
  };

  return (
    <View style={styles.container}>
      <Header showBack={showBack} title={ad.usersTitle || 'Patients & Providers'} />
      <View style={styles.tabsWrap}>
        <SegmentedTabs isRTL={isRTL} activeKey={activeTab} onChange={setActiveTab} options={tabs} />
      </View>
      <View style={styles.searchWrap}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={ad.searchUsers || 'Search by name, phone, or email'}
          placeholderTextColor={COLORS.gray500}
          style={styles.searchInput}
        />
      </View>
      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={styles.loader} />
      ) : isError ? (
        <EmptyState
          title={ad.loadError || 'Could not load users'}
          actionLabel={t.messaging?.retry || t.common?.retry || 'Retry'}
          onAction={refetch}
        />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item._id || item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarInset }]}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          ListEmptyComponent={<EmptyState title={ad.noUsers || 'No users found'} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabsWrap: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.sm },
  searchWrap: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  searchInput: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.textPrimary,
  },
  list: { padding: SPACING.lg },
  loader: { marginTop: SPACING.xxl },
  card: { marginBottom: SPACING.md },
  topRow: { justifyContent: 'space-between', gap: SPACING.sm },
  flex: { flex: 1 },
  activateBtn: { marginTop: SPACING.md, alignSelf: 'flex-start' },
});

export default AdminUsersScreen;
