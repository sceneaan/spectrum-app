import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Header from '../../components/Header';
import ProviderStatusBadge from '../../components/provider/ProviderStatusBadge';
import { AppText, AppCard, SegmentedTabs, EmptyState } from '../../components/ui';
import { showToast } from '../../components/InAppToast';
import { useLanguage } from '../../store/LanguageContext';
import { useAuthStore } from '../../store/authStore';
import { useGetUserData } from '../../api/services/User.Service';
import { hasAdminPermission } from '../../utils/adminPermissions';
import { useAdminGetClinicBookings, useAdminUpdateClinicBooking } from '../../api/services/Admin.Service';
import COLORS from '../../constants/colors';
import { SPACING } from '../../theme';

const AdminClinicBookingsScreen = ({ showBack = true }) => {
  const { t, isRTL } = useLanguage();
  const ad = t.adminDashboard || {};
  const user = useAuthStore((state) => state.user);
  const { data: userData } = useGetUserData();
  const profile = userData || user;
  const canManage = hasAdminPermission(profile, 'manage_appointments');
  const [activeTab, setActiveTab] = useState('pending');
  const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };

  const query = useMemo(() => ({
    page: 1,
    limit: 40,
    ...(activeTab !== 'all' ? { status: activeTab } : {}),
  }), [activeTab]);

  const { data, isLoading, isError, refetch, isRefetching } = useAdminGetClinicBookings(query);
  const { mutate: updateBooking, isPending: updating } = useAdminUpdateClinicBooking();

  const bookings = data?.bookings || [];
  const tabs = [
    { key: 'pending', label: ad.pending || 'Pending' },
    { key: 'confirmed', label: ad.confirmed || 'Confirmed' },
    { key: 'all', label: ad.all || 'All' },
  ];

  const runStatusUpdate = (booking, status) => {
    const id = booking._id || booking.id;
    if (!id) return;
    updateBooking(
      { bookingId: id, payload: { status } },
      {
        onSuccess: () => {
          showToast({
            type: 'success',
            title: t.common?.success || 'Success',
            message: status === 'confirmed'
              ? (ad.bookingConfirmed || 'Booking confirmed')
              : (ad.bookingCancelled || 'Booking cancelled'),
          });
          refetch();
        },
        onError: () => {
          showToast({
            type: 'error',
            title: t.common?.error || 'Error',
            message: ad.bookingUpdateFailed || 'Could not update booking',
          });
        },
      },
    );
  };

  const confirmBooking = (booking) => {
    Alert.alert(
      ad.confirmBookingTitle || 'Confirm booking',
      ad.confirmBookingMessage || 'Confirm this clinic booking?',
      [
        { text: t.common?.cancel || 'Cancel', style: 'cancel' },
        { text: ad.confirm || 'Confirm', onPress: () => runStatusUpdate(booking, 'confirmed') },
      ],
    );
  };

  const cancelBooking = (booking) => {
    Alert.alert(
      ad.cancelBookingTitle || 'Cancel booking',
      ad.cancelBookingMessage || 'Cancel this clinic booking?',
      [
        { text: t.common?.no || 'No', style: 'cancel' },
        {
          text: ad.cancelAction || 'Cancel',
          style: 'destructive',
          onPress: () => runStatusUpdate(booking, 'cancelled'),
        },
      ],
    );
  };

  const renderItem = ({ item }) => (
    <AppCard style={styles.card} padding={SPACING.lg}>
      <View style={[styles.topRow, rowStyle]}>
        <View style={styles.flex}>
          <AppText variant="bodyMedium">{item.patientName}</AppText>
          <AppText variant="caption" color={COLORS.textSecondary}>{item.doctorName}</AppText>
        </View>
        <ProviderStatusBadge status={item.status} />
      </View>
      <AppText variant="bodySmall" color={COLORS.textSecondary}>
        {[item.preferredDate, item.preferredTime].filter(Boolean).join(' · ')}
      </AppText>
      {item.phone ? (
        <AppText variant="caption" color={COLORS.textSecondary} style={styles.phone}>{item.phone}</AppText>
      ) : null}
      {canManage && item.status === 'pending' ? (
        <View style={[styles.actions, rowStyle]}>
          <TouchableOpacity onPress={() => confirmBooking(item)} disabled={updating} style={styles.actionBtn}>
            <AppText variant="caption" color={COLORS.primaryDark}>{ad.confirm || 'Confirm'}</AppText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => cancelBooking(item)} disabled={updating} style={styles.actionBtn}>
            <AppText variant="caption" color={COLORS.danger}>{ad.cancelAction || 'Cancel'}</AppText>
          </TouchableOpacity>
        </View>
      ) : null}
    </AppCard>
  );

  return (
    <View style={styles.container}>
      <Header showBack={showBack} title={ad.bookingsTitle || 'Clinic Bookings'} />
      <View style={styles.tabsWrap}>
        <SegmentedTabs isRTL={isRTL} activeKey={activeTab} onChange={setActiveTab} options={tabs} />
      </View>
      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={styles.loader} />
      ) : isError ? (
        <EmptyState
          title={ad.loadError || 'Could not load bookings'}
          actionLabel={t.messaging?.retry || t.common?.retry || 'Retry'}
          onAction={refetch}
        />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => String(item._id || item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          ListEmptyComponent={<EmptyState title={ad.noBookings || 'No clinic bookings'} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabsWrap: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.sm },
  list: { padding: SPACING.lg, paddingBottom: 40 },
  loader: { marginTop: SPACING.xxl },
  card: { marginBottom: SPACING.md },
  topRow: { justifyContent: 'space-between', gap: SPACING.sm },
  flex: { flex: 1 },
  phone: { marginTop: SPACING.xs },
  actions: { marginTop: SPACING.md, gap: SPACING.lg },
  actionBtn: { paddingVertical: SPACING.xs },
});

export default AdminClinicBookingsScreen;
