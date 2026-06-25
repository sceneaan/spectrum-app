import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeviceEventEmitter } from 'react-native';
import Header from '../components/Header';
import { EmptyState } from '../components/ui';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import {
  useGetNotifications,
  useMarkNotificationsAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteAllNotifications,
  NOTIFICATION_TYPES,
} from '../api/services/Notification.Service';
import { requestUserPermission } from '../utils/notificationService';
import { useAuthStore } from '../store/authStore';
import { FCM_FOREGROUND_EVENT } from '../utils/fcmEvents';
import { useLanguage } from '../store/LanguageContext';
import { daysAgo } from '../utils/timeFormatter';
import Skeleton from '../components/Skeleton';
import { SPACING, RADIUS, SHADOWS, cardBorder } from '../theme';

const ARABIC_RE = /[\u0600-\u06FF]/;

const containsArabic = (text) => ARABIC_RE.test(text || '');

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();

  const [filter, setFilter] = useState('all');
  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { user, token } = useAuthStore();

  const {
    data: notificationsData,
    isLoading,
    refetch,
  } = useGetNotifications({ limit: 50 });

  const { mutate: markRead } = useMarkNotificationsAsRead();
  const { mutate: markAllRead, isPending: isMarkingAll } = useMarkAllNotificationsAsRead();
  const { mutate: deleteAll, isPending: isDeletingAll } = useDeleteAllNotifications();

  useEffect(() => {
    const initNotifications = async () => {
      await requestUserPermission(user?.role || 'patient', token);
    };
    initNotifications();

    const sub = DeviceEventEmitter.addListener(FCM_FOREGROUND_EVENT, () => {
      refetch();
    });

    return () => sub.remove();
  }, [refetch, user?.role, token]);

  const notifications = notificationsData?.docs || [];

  const rowStyle = useMemo(
    () => ({ flexDirection: isRTL ? 'row-reverse' : 'row' }),
    [isRTL],
  );

  const accentBorder = isRTL
    ? { borderRightWidth: 4, borderRightColor: COLORS.primary }
    : { borderLeftWidth: 4, borderLeftColor: COLORS.primary };

  const filterOptions = useMemo(() => [
    { key: 'all', label: t.notifications?.categories?.all || 'All' },
    { key: NOTIFICATION_TYPES.APPOINTMENT, label: t.notifications?.categories?.appointments || 'Appointments' },
    { key: NOTIFICATION_TYPES.WALLET, label: t.notifications?.categories?.wallet || 'Wallet' },
    { key: NOTIFICATION_TYPES.PAYMENT, label: t.notifications?.categories?.payments || 'Payments' },
    { key: NOTIFICATION_TYPES.MESSAGE, label: t.notifications?.categories?.messages || 'Messages' },
    { key: NOTIFICATION_TYPES.PRESCRIPTION, label: t.notifications?.categories?.prescriptions || 'Prescriptions' },
    { key: NOTIFICATION_TYPES.MEDICAL_REPORT, label: t.notifications?.categories?.reports || 'Reports' },
    { key: NOTIFICATION_TYPES.REFILL_REQUEST, label: t.notifications?.categories?.refills || 'Refills' },
    { key: NOTIFICATION_TYPES.SURVEY, label: t.notifications?.categories?.surveys || 'Surveys' },
    { key: NOTIFICATION_TYPES.SYSTEM, label: t.notifications?.categories?.system || 'System' },
  ], [t]);

  const orderedFilters = isRTL ? [...filterOptions].reverse() : filterOptions;

  const getFilteredData = () => {
    if (filter === 'all') return notifications;
    return notifications.filter((n) => n.type === filter);
  };

  const handleMarkAllRead = () => {
    markAllRead(null, {
      onSuccess: () => {
        setMenuVisible(false);
        Alert.alert(
          t.notifications?.success || 'Success',
          t.notifications?.allNotificationsMarkedRead || 'All notifications marked as read',
        );
      },
    });
  };

  const handleDeleteAll = () => {
    Alert.alert(
      t.notifications?.deleteAll || 'Delete All',
      t.notifications?.deleteAllConfirmation || 'Are you sure you want to delete all notifications?',
      [
        { text: t.notifications?.cancel || 'Cancel', style: 'cancel' },
        {
          text: t.notifications?.delete || 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteAll(null, {
              onSuccess: () => setMenuVisible(false),
            });
          },
        },
      ],
    );
  };

  const handleNotificationPress = (item) => {
    if (!item.read) {
      markRead([item._id]);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const getIcon = (type) => {
    switch (type) {
      case NOTIFICATION_TYPES.WALLET: return ICONS.wallet;
      case NOTIFICATION_TYPES.APPOINTMENT: return ICONS.calendar;
      case NOTIFICATION_TYPES.PRESCRIPTION: return ICONS.prescription;
      case NOTIFICATION_TYPES.MESSAGE: return ICONS.inbox;
      case NOTIFICATION_TYPES.MEDICAL_REPORT: return ICONS.report;
      case NOTIFICATION_TYPES.REFILL_REQUEST: return ICONS.refill;
      case NOTIFICATION_TYPES.SURVEY: return ICONS.star;
      case NOTIFICATION_TYPES.PAYMENT: return ICONS.creditCard;
      default: return ICONS.bell;
    }
  };

  const FilterChip = ({ label, type }) => {
    const isActive = filter === type;
    return (
      <TouchableOpacity
        style={[styles.chip, isActive && styles.chipActive]}
        onPress={() => setFilter(type)}
        activeOpacity={0.8}
      >
        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const NotificationItem = ({ item }) => {
    const body = item.description || item.body || '';
    const textRTL = isRTL || containsArabic(item.title) || containsArabic(body);
    const align = textRTL ? 'right' : 'left';
    const writingDirection = textRTL ? 'rtl' : 'ltr';

    return (
      <TouchableOpacity onPress={() => handleNotificationPress(item)} activeOpacity={0.85}>
        <View style={[styles.card, !item.read && accentBorder, SHADOWS.sm, cardBorder]}>
          <View style={[styles.cardRow, rowStyle]}>
            <View style={styles.iconContainer}>
              <Image source={getIcon(item.type)} style={styles.icon} resizeMode="contain" />
              {!item.read && (
                <View style={[styles.unreadDot, isRTL ? { left: 2 } : { right: 2 }]} />
              )}
            </View>

            <View style={styles.cardBody}>
              <View style={[styles.cardHeaderRow, rowStyle]}>
                <Text
                  style={[
                    styles.cardTitle,
                    { textAlign: align, writingDirection },
                    !item.read && styles.cardTitleUnread,
                  ]}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                <Text style={[styles.timeText, { textAlign: textRTL ? 'left' : 'right' }]}>
                  {daysAgo(item.createdAt)}
                </Text>
              </View>
              <Text
                style={[styles.cardDesc, { textAlign: align, writingDirection }]}
                numberOfLines={3}
              >
                {body}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.container}>
        <Header
          title={t.notifications?.title || 'Notifications'}
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.listPad}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.skeletonCard, rowStyle]}>
              <Skeleton width={48} height={48} style={{ borderRadius: 24 }} />
              <View style={{ flex: 1, marginHorizontal: SPACING.md }}>
                <Skeleton width="70%" height={13} style={{ marginBottom: SPACING.sm }} />
                <Skeleton width="85%" height={11} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  const listBottomPad = 100 + insets.bottom;

  return (
    <View style={styles.container}>
      <Header
        title={t.notifications?.title || 'Notifications'}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={[styles.filterContent, rowStyle]}
      >
        {orderedFilters.map((opt) => (
          <FilterChip key={opt.key} label={opt.label} type={opt.key} />
        ))}
      </ScrollView>

      <FlatList
        data={getFilteredData()}
        keyExtractor={(item, index) => item._id || index.toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPad }]}
        renderItem={({ item }) => <NotificationItem item={item} />}
        removeClippedSubviews
        initialNumToRender={12}
        maxToRenderPerBatch={8}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        )}
        ListEmptyComponent={(
          <EmptyState
            icon={ICONS.emptyBox}
            title={t.notifications?.noNotifications || 'No notifications yet'}
            subtitle={t.notifications?.allCaughtUp}
          />
        )}
      />

      <TouchableOpacity
        style={[
          styles.fab,
          { bottom: SPACING.xl + insets.bottom },
          isRTL ? { left: SPACING.xl } : { right: SPACING.xl },
        ]}
        onPress={() => setMenuVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={t.notifications?.markAllAsRead || 'Actions'}
      >
        <Image source={ICONS.dots} style={styles.fabIcon} />
      </TouchableOpacity>

      <Modal transparent visible={menuVisible} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.menuContainer,
                isRTL
                  ? { left: SPACING.xl, bottom: 88 + insets.bottom }
                  : { right: SPACING.xl, bottom: 88 + insets.bottom },
              ]}
            >
              <TouchableOpacity
                style={[styles.menuItem, rowStyle]}
                onPress={handleMarkAllRead}
                disabled={isMarkingAll}
              >
                {isMarkingAll ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <>
                    <Image source={ICONS.checkDouble} style={styles.menuIcon} />
                    <Text style={[styles.menuText, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {t.notifications?.markAllAsRead || 'Mark all as read'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity
                style={[styles.menuItem, rowStyle]}
                onPress={handleDeleteAll}
                disabled={isDeletingAll}
              >
                {isDeletingAll ? (
                  <ActivityIndicator size="small" color={COLORS.danger} />
                ) : (
                  <>
                    <Image source={ICONS.trash} style={[styles.menuIcon, { tintColor: COLORS.danger }]} />
                    <Text style={[styles.menuText, styles.menuTextDanger, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {t.notifications?.deleteAll || 'Delete All'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  filterScroll: {
    marginVertical: SPACING.sm,
    flexGrow: 0,
    maxHeight: 48,
  },
  filterContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    alignItems: 'center',
  },
  chip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceMuted,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.white,
  },
  listPad: {
    padding: SPACING.lg,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  skeletonCard: {
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    ...cardBorder,
  },
  card: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  cardRow: {
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  icon: {
    width: 24,
    height: 24,
    tintColor: COLORS.primaryDark,
  },
  unreadDot: {
    position: 'absolute',
    top: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.warning,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardHeaderRow: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  cardTitleUnread: {
    fontWeight: '700',
  },
  timeText: {
    fontSize: 11,
    color: COLORS.gray500,
    flexShrink: 0,
    marginTop: 2,
    maxWidth: 96,
  },
  cardDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  fabIcon: {
    width: 22,
    height: 22,
    tintColor: COLORS.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
  },
  menuContainer: {
    position: 'absolute',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xs,
    minWidth: 200,
    ...SHADOWS.md,
  },
  menuItem: {
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  menuIcon: {
    width: 18,
    height: 18,
    tintColor: COLORS.textSecondary,
  },
  menuText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  menuTextDanger: {
    color: COLORS.danger,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
  },
});

export default NotificationsScreen;
