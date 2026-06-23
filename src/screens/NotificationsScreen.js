import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, Image, StyleSheet, Modal, TouchableWithoutFeedback, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next'; // Use standard i18n hook
import Header from '../components/Header';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import { 
    useGetNotifications, 
    useMarkNotificationsAsRead, 
    useMarkAllNotificationsAsRead, 
    useDeleteAllNotifications,
    NOTIFICATION_TYPES
} from '../api/services/Notification.Service';
import { requestUserPermission } from '../utils/notificationService';
import { useAuthStore } from '../store/authStore';
import messaging from '@react-native-firebase/messaging';
import Skeleton from '../components/Skeleton';

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  
  const [filter, setFilter] = useState('all');
  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { user, token } = useAuthStore();

  // API Hooks
  const {
      data: notificationsData,
      isLoading,
      refetch,
      isRefetching,
      error: notificationsError
  } = useGetNotifications({ limit: 50 }); // Fetch first 50


  const { mutate: markRead } = useMarkNotificationsAsRead();
  const { mutate: markAllRead, isPending: isMarkingAll } = useMarkAllNotificationsAsRead();
  const { mutate: deleteAll, isPending: isDeletingAll } = useDeleteAllNotifications();

  // Request Permission on Mount & Listen for Updates
  useEffect(() => {
      const initNotifications = async () => {
          await requestUserPermission(user?.role || 'patient', token); // Pass role/token if needed by updated logic
      };
      initNotifications();

      // Listen for foreground messages
      const unsubscribe = messaging().onMessage(async remoteMessage => {
          refetch();
      });

      return unsubscribe;
  }, []);

  const notifications = notificationsData?.docs || [];

  // --- RTL STYLES ---
  const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
  const alignText = { textAlign: isRTL ? 'right' : 'left' };

  const cardBorder = isRTL
    ? { borderRightWidth: 4, borderRightColor: COLORS.primary }
    : { borderLeftWidth: 4, borderLeftColor: COLORS.primary };

  const iconMargin = isRTL ? { marginLeft: 10 } : { marginRight: 10 };

  // --- LOGIC ---
  const getFilteredData = () => {
    if (filter === 'all') return notifications;
    // Map UI filter to API types if necessary
    return notifications.filter(n => n.type === filter);
  };

  const getCount = (type) => {
      if (type === 'all') return notifications.length;
      return notifications.filter(n => n.type === type).length;
  };

  const handleMarkAllRead = () => {
    markAllRead(null, {
        onSuccess: () => {
            setMenuVisible(false);
            Alert.alert(t('notifications.success') || 'Success', t('notifications.allNotificationsMarkedRead') || 'All notifications marked as read');
        }
    });
  };

  const handleDeleteAll = () => {
    Alert.alert(
        t('notifications.deleteAll') || 'Delete All',
        t('notifications.deleteAllConfirmation') || 'Are you sure you want to delete all notifications?',
        [
            { text: t('notifications.cancel') || 'Cancel', style: 'cancel' },
            {
                text: t('notifications.delete') || 'Delete',
                style: 'destructive',
                onPress: () => {
                    deleteAll(null, {
                        onSuccess: () => {
                            setMenuVisible(false);
                        }
                    });
                }
            }
        ]
    );
  };

  const handleNotificationPress = (item) => {
      if (!item.read) {
          markRead([item._id]);
      }
      // Navigate based on type if needed
      // if (item.type === NOTIFICATION_TYPES.APPOINTMENT) navigation.navigate('AppointmentsScreen');
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // --- RENDER ITEMS ---
  const FilterChip = ({ label, type }) => {
    const isActive = filter === type;
    // const count = `(${getCount(type)})`; 

    return (
      <TouchableOpacity
        style={[styles.chip, isActive && styles.chipActive]}
        onPress={() => setFilter(type)}
      >
        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const NotificationItem = ({ item }) => {
    const timeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000 / 60); // minutes
        if (diff < 60) return `${diff}m ago`;
        if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
        return date.toLocaleDateString();
    };

    const getIcon = (type) => {
        switch(type) {
            case NOTIFICATION_TYPES.WALLET: return ICONS.wallet;
            case NOTIFICATION_TYPES.APPOINTMENT: return ICONS.calendar;
            case NOTIFICATION_TYPES.PRESCRIPTION: return ICONS.prescription;
            case NOTIFICATION_TYPES.MESSAGE: return ICONS.message || ICONS.bell;
            case NOTIFICATION_TYPES.MEDICAL_REPORT: return ICONS.medicalReport || ICONS.bell;
            case NOTIFICATION_TYPES.REFILL_REQUEST: return ICONS.refill || ICONS.bell;
            case NOTIFICATION_TYPES.SURVEY: return ICONS.star || ICONS.bell;
            default: return ICONS.bell; // Fallback
        }
    };

    return (
        <TouchableOpacity onPress={() => handleNotificationPress(item)}>
            <View style={[styles.card, !item.read && cardBorder]}>
            <View style={[styles.cardRow, rowStyle]}>
                {/* Icon Container */}
                <View style={styles.iconContainer}>
                <Image
                    source={getIcon(item.type)} 
                    style={styles.icon}
                />
                {!item.read && <View style={[styles.unreadDot, isRTL ? { left: 0 } : { right: 0 }]} />}
                </View>

                {/* Content */}
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                <View style={[rowStyle, { justifyContent: 'space-between', alignItems: 'center' }]}>
                    <Text style={[styles.cardTitle, alignText, !item.read && { fontWeight: 'bold' }]}>{item.title}</Text>
                    <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
                </View>
                <Text style={[styles.cardDesc, alignText]} numberOfLines={2}>
                    {item.description || item.body} 
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
              <View style={{ padding: 16 }}>
                  {[0, 1, 2, 3, 4].map(i => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 15, backgroundColor: '#fff', borderRadius: 16, marginBottom: 10 }}>
                          <Skeleton width={45} height={45} style={{ borderRadius: 22.5, marginRight: 12 }} />
                          <View style={{ flex: 1 }}>
                              <Skeleton width="70%" height={13} style={{ marginBottom: 8 }} />
                              <Skeleton width="85%" height={11} />
                          </View>
                      </View>
                  ))}
              </View>
          </View>
      );
  }

  return (
    <View style={styles.container}>
      <Header title={t('notifications.title') || "Notifications"} showBack onBack={() => navigation.goBack()} />

      {/* Filter Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={[rowStyle, { gap: 8, paddingHorizontal: 16 }]}>
        <FilterChip label={t('notifications.categories.all') || 'All'} type="all" />
        <FilterChip label={t('notifications.categories.appointments') || 'Appointments'} type={NOTIFICATION_TYPES.APPOINTMENT} />
        <FilterChip label={t('notifications.categories.wallet') || 'Wallet'} type={NOTIFICATION_TYPES.WALLET} />
        <FilterChip label={t('notifications.categories.payments') || 'Payments'} type={NOTIFICATION_TYPES.PAYMENT} />
        <FilterChip label={t('notifications.categories.messages') || 'Messages'} type={NOTIFICATION_TYPES.MESSAGE} />
        <FilterChip label={t('notifications.categories.prescriptions') || 'Prescriptions'} type={NOTIFICATION_TYPES.PRESCRIPTION} />
        <FilterChip label={t('notifications.categories.reports') || 'Reports'} type={NOTIFICATION_TYPES.MEDICAL_REPORT} />
        <FilterChip label={t('notifications.categories.refills') || 'Refills'} type={NOTIFICATION_TYPES.REFILL_REQUEST} />
        <FilterChip label={t('notifications.categories.surveys') || 'Surveys'} type={NOTIFICATION_TYPES.SURVEY} />
        <FilterChip label={t('notifications.categories.system') || 'System'} type={NOTIFICATION_TYPES.SYSTEM} />
      </ScrollView>

      {/* List */}
      <FlatList
        data={getFilteredData()}
        keyExtractor={(item, index) => item._id || index.toString()}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        renderItem={({ item }) => <NotificationItem item={item} />}
        removeClippedSubviews={true}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 50 }}>
            <Image source={ICONS.emptyBox} style={{ width: 60, height: 60, opacity: 0.3, marginBottom: 10 }} />
            <Text style={{ color: COLORS.gray500 }}>{t('notifications.noNotifications') || "No notifications yet"}</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, isRTL ? { left: 20 } : { right: 20 }]}
        onPress={() => setMenuVisible(true)}
      >
        <Image source={ICONS.dots} style={{ width: 24, height: 24, tintColor: 'white' }} />
      </TouchableOpacity>

      {/* Menu Modal */}
      <Modal transparent visible={menuVisible} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[
              styles.menuContainer,
              isRTL ? { left: 20, bottom: 90 } : { right: 20, bottom: 90 }
            ]}>
              <TouchableOpacity style={[styles.menuItem, rowStyle]} onPress={handleMarkAllRead} disabled={isMarkingAll}>
                {isMarkingAll ? <ActivityIndicator size="small" color={COLORS.primary} /> : (
                    <>
                    <Image source={ICONS.checkDouble} style={[styles.menuIcon, iconMargin]} />
                    <Text style={styles.menuText}>{t('notifications.markAllAsRead') || "Mark all as read"}</Text>
                    </>
                )}
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={[styles.menuItem, rowStyle]} onPress={handleDeleteAll} disabled={isDeletingAll}>
                {isDeletingAll ? <ActivityIndicator size="small" color={COLORS.danger} /> : (
                    <>
                    <Image source={ICONS.trash} style={[styles.menuIcon, iconMargin, { tintColor: COLORS.danger }]} />
                    <Text style={[styles.menuText, { color: COLORS.danger }]}>{t('notifications.deleteAll') || "Delete All"}</Text>
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
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },

  filterContainer: { paddingHorizontal: 20, paddingVertical: 10, gap: 10 },
  filterScroll: { marginVertical: 10, flexGrow: 0 },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: COLORS.gray300, height: 36, justifyContent: 'center' },
  chipActive: { backgroundColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.gray700 },
  chipTextActive: { color: COLORS.white, fontWeight: 'bold' },

  card: { backgroundColor: COLORS.white, padding: 15, borderRadius: 16, marginBottom: 10, shadowColor: COLORS.shadow, shadowOpacity: 0.05, elevation: 2 },
  cardRow: { alignItems: 'flex-start' },

  iconContainer: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: COLORS.gray100, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 20, height: 20, tintColor: COLORS.gray700 },
  unreadDot: { position: 'absolute', top: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.warning, borderWidth: 1.5, borderColor: COLORS.white },

  cardTitle: { fontSize: 14, color: COLORS.textPrimary, flex: 1 },
  timeText: { fontSize: 11, color: COLORS.gray500 },
  cardDesc: { fontSize: 13, color: COLORS.gray600, marginTop: 4, lineHeight: 18 },

  fab: { position: 'absolute', bottom: 30, width: 55, height: 55, borderRadius: 28, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: COLORS.primary, shadowOpacity: 0.4 },

  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay },
  menuContainer: { position: 'absolute', backgroundColor: COLORS.white, borderRadius: 12, padding: 5, width: 180, elevation: 5 },
  menuItem: { padding: 12, alignItems: 'center' },
  menuIcon: { width: 18, height: 18, tintColor: COLORS.gray700 },
  menuText: { fontSize: 14, color: COLORS.textPrimary },
  divider: { height: 1, backgroundColor: COLORS.gray200 }
});

export default NotificationsScreen;
