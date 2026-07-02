import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, Image, TouchableOpacity, FlatList } from 'react-native';
import { useNavigation, useIsFocused, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../store/LanguageContext';
import { useAuthStore } from '../store/authStore';
import Header from '../components/Header';
import Skeleton from '../components/Skeleton';
import { AppText, EmptyState } from '../components/ui';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import { usePatientGetThreads } from '@api/services/Thread.Service';
import { useGetCompletedAppointments } from '@api/services/Appointment.Service';
import { daysAgo } from '@utils/timeFormatter';
import { getProviderId } from '@utils/userId';
import { isRTL } from '@utils/rtlUtils';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { getMessagingEligibility } from '@utils/messagingEligibility';
import { SPACING, RADIUS, SHADOWS, cardBorder } from '../theme';
import useGlassTabBarInset from '../navigation/useGlassTabBarInset';

const InboxScreen = () => {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const route = useRoute();
  const { isAuthenticated } = useAuthStore();
  const insets = useSafeAreaInsets();
  const tabBarInset = useGlassTabBarInset();
  const [search, setSearch] = useState('');
  const [threads, setThreads] = useState([]);
  const [filteredThreads, setFilteredThreads] = useState([]);
  const [unreadOnly, setUnreadOnly] = useState(Boolean(route.params?.filterUnread));

  const rtl = isRTL();
  const rowStyle = { flexDirection: rtl ? 'row-reverse' : 'row' };
  const alignText = rtl ? 'right' : 'left';

  const {
    data: userThreads,
    error: userThreadsError,
    isLoading: userThreadsLoader,
    refetch,
  } = usePatientGetThreads();

  const { data: appointments, isLoading: appointmentsLoading } = useGetCompletedAppointments();

  const hasRecentAppointment = (providerId) => {
    const eligibility = getMessagingEligibility(appointments, providerId);
    if (eligibility === null) return !appointmentsLoading;
    return eligibility;
  };

  const isFocused = useIsFocused();

  useEffect(() => {
    if (typeof route.params?.filterUnread === 'boolean') {
      setUnreadOnly(route.params.filterUnread);
    }
  }, [route.params?.filterUnread]);

  const threadMatchesUnread = (item) => {
    if (typeof item?.unreadCount === 'number') return item.unreadCount > 0;
    if (typeof item?.patientUnreadCount === 'number') return item.patientUnreadCount > 0;
    if (item?.hasUnread) return true;
    const senderId = item?.lastMessage?.senderId || item?.lastMessage?.sender?._id;
    const patientId = item?.patient?._id || item?.patient?.id;
    if (senderId && patientId && String(senderId) !== String(patientId)) return true;
    return false;
  };

  useEffect(() => {
    if (isFocused && isAuthenticated) {
      refetch();
    }
  }, [isFocused, refetch, isAuthenticated]);

  useEffect(() => {
    if (userThreads && isAuthenticated) {
      const raw = userThreads.threads ?? userThreads;
      const threadsList = Array.isArray(raw) ? raw : [];
      setThreads(threadsList);
      setFilteredThreads(threadsList);
    }
  }, [userThreads, isAuthenticated]);

  useEffect(() => {
    let base = threads;
    if (unreadOnly) {
      base = threads.filter(threadMatchesUnread);
    }

    if (search.trim() === '') {
      setFilteredThreads(base);
    } else {
      const filtered = base.filter((item) => {
        const fullName = item?.provider?.fullName || '';
        const fullNameArabic = item?.provider?.fullNameArabic || '';
        const fullNameEnglish = item?.provider?.fullNameEnglish || '';
        const searchLower = search.toLowerCase();
        return fullName.toLowerCase().includes(searchLower)
          || fullNameArabic.toLowerCase().includes(searchLower)
          || fullNameEnglish.toLowerCase().includes(searchLower);
      });
      setFilteredThreads(filtered);
    }
  }, [search, threads, unreadOnly]);

  const renderItem = ({ item }) => {
    const profileImageSource = item?.provider?.profileImage
      ? { uri: item.provider.profileImage }
      : ICONS.defaultAvatar;

    const providerId = item?.provider?._id || item?.provider?.id;
    const isExpired = !hasRecentAppointment(providerId);
    const providerName = rtl
      ? (item?.provider?.fullNameArabic || item?.provider?.fullName || t.messaging?.unknownProvider)
      : (item?.provider?.fullNameEnglish || item?.provider?.fullName || t.messaging?.unknownProvider);

    return (
      <TouchableOpacity
        style={styles.msgCard}
        onPress={() => navigation.navigate('ChatDetails', { thread: item })}
        activeOpacity={0.75}
      >
        <View style={[rowStyle, { alignItems: 'center' }]}>
          <View style={styles.avatarRing}>
            <Image source={profileImageSource} style={styles.avatar} />
          </View>
          <View style={[styles.msgContent, { alignItems: rtl ? 'flex-end' : 'flex-start' }]}>
            <View style={[rowStyle, styles.msgHeader]}>
              <View style={[rowStyle, { alignItems: 'center', flex: 1 }]}>
                <AppText variant="bodyMedium" align={alignText} numberOfLines={1} style={{ flex: 1 }}>
                  {providerName}
                </AppText>
                {isExpired && (
                  <View style={styles.expiredBadge}>
                    <Icon name="clock" size={10} color={COLORS.gray500} />
                  </View>
                )}
              </View>
              <AppText variant="caption" style={styles.time}>
                {daysAgo(item?.updatedAt || item?.createdAt)}
              </AppText>
            </View>

            <AppText variant="caption" color={COLORS.primaryDark} style={styles.type}>
              {item?.type === 'General'
                ? (t.messaging?.general || 'General')
                : (item?.type || (t.messaging?.general || 'General'))}
            </AppText>

            {(item?.lastMessage?.attachment?.fileId || item?.lastMessage?.attachment?.url) ? (
              <View style={[styles.fileChip, rowStyle]}>
                <Image source={ICONS.file} style={styles.fileIcon} />
                <AppText variant="caption">{t.messaging?.attachment || 'Attachment'}</AppText>
              </View>
            ) : (
              <AppText variant="bodySmall" align={alignText} numberOfLines={1} style={styles.msgPreview}>
                {item?.lastMessage?.body || t.messaging?.noMessages || 'No messages yet'}
              </AppText>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header title={t.tabs?.inbox || 'Inbox'} showProfile />
      <View style={styles.content}>
        {unreadOnly && (
          <TouchableOpacity
            style={styles.unreadBanner}
            onPress={() => setUnreadOnly(false)}
            activeOpacity={0.8}
          >
            <AppText variant="caption" color={COLORS.primaryDark}>
              {t.messaging?.showingUnread || 'Showing unread only'} · {t.messaging?.showAll || 'Show all'}
            </AppText>
          </TouchableOpacity>
        )}
        <View style={[styles.searchBox, rowStyle]}>
          <Image source={ICONS.search} style={styles.searchIcon} />
          <TextInput
            placeholder={t.messaging?.searchMessages || 'Search messages...'}
            style={[styles.input, { textAlign: alignText }]}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={COLORS.gray500}
          />
        </View>

        {userThreadsLoader ? (
          <View style={styles.listPad}>
            <View style={[styles.searchSkeleton, rowStyle]}>
              <Skeleton width="100%" height={48} style={{ borderRadius: RADIUS.pill }} />
            </View>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[styles.skeletonCard, rowStyle]}>
                <Skeleton width={48} height={48} style={{ borderRadius: 24, marginEnd: SPACING.md }} />
                <View style={{ flex: 1 }}>
                  <Skeleton width="70%" height={13} style={{ marginBottom: SPACING.sm }} />
                  <Skeleton width="85%" height={11} />
                </View>
              </View>
            ))}
          </View>
        ) : userThreadsError ? (
          <EmptyState
            icon={ICONS.emptyBox}
            title={t.messaging?.threadsLoadError || 'Could not load your inbox.'}
            actionLabel={t.messaging?.retry || 'Retry'}
            onAction={() => refetch()}
          />
        ) : filteredThreads.length === 0 ? (
          <EmptyState
            icon={ICONS.emptyBox}
            title={search.trim()
              ? (t.messaging?.noMessagesFound || 'No messages found')
              : (t.messaging?.noMessages || 'No messages yet')}
            subtitle={!search.trim() ? (t.messaging?.composeHint || 'Tap + to start a new conversation') : undefined}
          />
        ) : (
          <FlatList
            data={filteredThreads}
            renderItem={renderItem}
            keyExtractor={(item, index) => item._id?.toString() || index.toString()}
            contentContainerStyle={[styles.listContent, { paddingBottom: tabBarInset }]}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews
            initialNumToRender={15}
            maxToRenderPerBatch={10}
          />
        )}
      </View>

      <TouchableOpacity
        style={[styles.fab, { bottom: tabBarInset + SPACING.md }, rtl ? { left: SPACING.xl } : { right: SPACING.xl }]}
        onPress={() => navigation.navigate('NewMessage')}
        activeOpacity={0.85}
      >
        <Image source={ICONS.plus} style={styles.fabIcon} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, flex: 1 },
  unreadBanner: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    marginBottom: SPACING.md,
  },
  searchBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.lg,
    height: 48,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  searchIcon: { width: 18, height: 18, tintColor: COLORS.gray500, marginEnd: SPACING.sm },
  input: { flex: 1, height: '100%', color: COLORS.textPrimary, fontSize: 15 },
  listPad: { paddingTop: SPACING.sm },
  searchSkeleton: { marginBottom: SPACING.lg },
  listContent: { paddingTop: SPACING.sm },
  skeletonCard: {
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
    ...cardBorder,
  },
  msgCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
    ...cardBorder,
  },
  avatarRing: {
    padding: 2,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryLight,
    marginEnd: SPACING.md,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.gray200 },
  msgContent: { flex: 1 },
  msgHeader: { justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 2 },
  type: { fontWeight: '600', marginBottom: 2 },
  msgPreview: { marginTop: 2 },
  time: { marginStart: SPACING.sm },
  fileChip: {
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  fileIcon: { width: 12, height: 12, tintColor: COLORS.textSecondary },
  expiredBadge: {
    marginStart: SPACING.sm,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.pill,
    padding: SPACING.xs,
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.primary,
  },
  fabIcon: { width: 22, height: 22, tintColor: COLORS.white },
});

export default InboxScreen;
