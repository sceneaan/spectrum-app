import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useNavigation, useIsFocused, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '../../components/Header';
import { AppText, EmptyState } from '../../components/ui';
import { useLanguage } from '../../store/LanguageContext';
import { useProviderGetThreads } from '../../api/services/Thread.Service';
import { daysAgo } from '../../utils/timeFormatter';
import { isRTL } from '../../utils/rtlUtils';
import { getPatientDisplayName } from '../../utils/providerAppointments';
import { normalizeThreadList, threadHasUnread } from '../../utils/threads';
import ICONS from '../../constants/icons';
import COLORS from '../../constants/colors';
import Skeleton from '../../components/Skeleton';
import { SPACING, RADIUS, SHADOWS, cardBorder } from '../../theme';

const MESSAGE_TYPE_FILTERS = [
  { key: 'all', labelKey: 'all' },
  { key: 'General', labelKey: 'general' },
  { key: 'Urgent', labelKey: 'urgent' },
  { key: 'Prescription Related', labelKey: 'prescriptionRelated' },
];

const formatThreadType = (type, t) => {
  if (!type || type === 'General') return t.messaging?.general || 'General';
  if (type === 'Urgent') return t.messaging?.urgent || 'Urgent';
  if (type === 'Prescription Related') return t.messaging?.prescriptionRelated || 'Prescription related';
  return type;
};

const ProviderInboxScreen = () => {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const pd = t.providerDashboard || {};

  const [search, setSearch] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(Boolean(route.params?.filterUnread));
  const [typeFilter, setTypeFilter] = useState('all');

  const rtl = isRTL();
  const rowStyle = { flexDirection: rtl ? 'row-reverse' : 'row' };
  const alignText = rtl ? 'right' : 'left';

  const {
    data: userThreads,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useProviderGetThreads();

  const isFocused = useIsFocused();

  useEffect(() => {
    if (typeof route.params?.filterUnread === 'boolean') {
      setUnreadOnly(route.params.filterUnread);
    }
  }, [route.params?.filterUnread]);

  useEffect(() => {
    if (isFocused) {
      refetch();
    }
  }, [isFocused, refetch]);

  const threads = useMemo(() => normalizeThreadList(userThreads), [userThreads]);

  const filteredThreads = useMemo(() => {
    let base = threads;
    if (unreadOnly) {
      base = threads.filter(threadHasUnread);
    }
    if (typeFilter !== 'all') {
      base = base.filter((item) => item.type === typeFilter);
    }
    if (!search.trim()) return base;

    const searchLower = search.toLowerCase();
    return base.filter((item) => {
      const name = getPatientDisplayName(item.patient, rtl) || item.patientName || '';
      return name.toLowerCase().includes(searchLower);
    });
  }, [search, threads, unreadOnly, typeFilter, rtl]);

  const openThread = (item) => {
    navigation.navigate('ChatDetails', { thread: item });
  };

  const renderItem = ({ item }) => {
    const patientName = getPatientDisplayName(item.patient, rtl) || item.patientName || pd.patient || 'Patient';
    const profileImageSource = item?.patient?.profileImage
      ? { uri: item.patient.profileImage }
      : ICONS.defaultAvatar;
    const hasAttachment = Boolean(
      item?.lastMessage?.attachment?.fileId || item?.lastMessage?.attachment?.url,
    );
    const preview = item?.lastMessage?.body || item?.lastMessage?.content || item?.lastMessage?.text || '';
    const time = item?.lastMessage?.createdAt || item?.updatedAt;
    const unread = threadHasUnread(item);

    return (
      <TouchableOpacity style={styles.msgCard} onPress={() => openThread(item)} activeOpacity={0.75}>
        <View style={[rowStyle, { alignItems: 'center' }]}>
          <View style={styles.avatarRing}>
            <Image source={profileImageSource} style={styles.avatar} />
            {unread ? <View style={styles.unreadDot} /> : null}
          </View>
          <View style={[styles.msgContent, { alignItems: rtl ? 'flex-end' : 'flex-start' }]}>
            <View style={[rowStyle, styles.msgHeader]}>
              <AppText variant="bodyMedium" align={alignText} numberOfLines={1} style={styles.patientName}>
                {patientName}
              </AppText>
              {time ? (
                <AppText variant="caption" color={COLORS.textSecondary} style={styles.time}>
                  {daysAgo(time, t)}
                </AppText>
              ) : null}
            </View>

            <AppText variant="caption" color={COLORS.primaryDark} style={styles.type}>
              {formatThreadType(item.type, t)}
            </AppText>

            {hasAttachment ? (
              <View style={[styles.fileChip, rowStyle]}>
                <Image source={ICONS.pdf} style={styles.fileIcon} />
                <AppText variant="caption" color={COLORS.textSecondary}>
                  {t.messaging?.attachment || 'Attachment'}
                </AppText>
              </View>
            ) : (
              <AppText variant="bodySmall" align={alignText} numberOfLines={1} style={styles.msgPreview}>
                {preview || t.messaging?.noMessages || 'No messages yet'}
              </AppText>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header title={pd.inboxTitle || 'Inbox'} showProfile />
      <View style={styles.content}>
        {unreadOnly ? (
          <TouchableOpacity
            style={styles.unreadBanner}
            onPress={() => setUnreadOnly(false)}
            activeOpacity={0.8}
          >
            <AppText variant="caption" color={COLORS.primaryDark}>
              {t.messaging?.showingUnread || 'Showing unread only'} · {t.messaging?.showAll || 'Show all'}
            </AppText>
          </TouchableOpacity>
        ) : null}

        <View style={[styles.searchBox, rowStyle]}>
          <Image source={ICONS.search} style={styles.searchIcon} />
          <TextInput
            style={[styles.input, { textAlign: alignText }]}
            placeholder={pd.searchPatients || 'Search patients'}
            placeholderTextColor={COLORS.gray500}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={[styles.filterRow, rowStyle]}>
          {MESSAGE_TYPE_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterChip, typeFilter === filter.key && styles.filterChipActive]}
              onPress={() => setTypeFilter(filter.key)}
            >
              <AppText
                variant="caption"
                color={typeFilter === filter.key ? COLORS.primaryDark : COLORS.textSecondary}
              >
                {filter.key === 'all'
                  ? (t.messaging?.all || 'All')
                  : formatThreadType(filter.key, t)}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <View style={styles.listPad}>
            {[1, 2, 3].map((k) => (
              <View key={k} style={[styles.skeletonCard, rowStyle]}>
                <Skeleton width={48} height={48} borderRadius={24} />
                <View style={{ flex: 1, marginStart: SPACING.md }}>
                  <Skeleton width="70%" height={13} style={{ marginBottom: SPACING.sm }} />
                  <Skeleton width="85%" height={11} />
                </View>
              </View>
            ))}
          </View>
        ) : isError ? (
          <EmptyState
            title={t.messaging?.threadsLoadError || 'Could not load your inbox.'}
            actionLabel={t.messaging?.retry || 'Retry'}
            onAction={() => refetch()}
          />
        ) : (
          <FlatList
            data={filteredThreads}
            keyExtractor={(item) => String(item._id || item.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={(
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
            )}
            ListEmptyComponent={(
              <EmptyState
                icon={ICONS.inbox}
                title={pd.noMessages || 'No messages yet'}
                subtitle={pd.composeHint || pd.noMessagesHint || 'Tap + to start a new conversation'}
              />
            )}
          />
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.fab,
          { bottom: SPACING.xxxl + insets.bottom },
          rtl ? { left: SPACING.xl } : { right: SPACING.xl },
        ]}
        onPress={() => navigation.navigate('ProviderNewMessage')}
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
  filterRow: { flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceMuted,
  },
  filterChipActive: { backgroundColor: COLORS.primaryLight },
  listPad: { paddingTop: SPACING.sm },
  listContent: { paddingTop: SPACING.sm, paddingBottom: 100 },
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
    position: 'relative',
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.gray200 },
  unreadDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  msgContent: { flex: 1, minWidth: 0 },
  msgHeader: { justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 2 },
  patientName: { flex: 1, marginEnd: SPACING.sm },
  type: { fontWeight: '600', marginBottom: 2 },
  msgPreview: { marginTop: 2, color: COLORS.textSecondary },
  time: { flexShrink: 0 },
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

export default ProviderInboxScreen;
