import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
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
import ICONS from '../../constants/icons';
import COLORS from '../../constants/colors';
import Skeleton from '../../components/Skeleton';
import { SPACING, RADIUS, SHADOWS, cardBorder } from '../../theme';

const ProviderInboxScreen = () => {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const pd = t.providerDashboard || {};

  const [search, setSearch] = useState('');
  const [threads, setThreads] = useState([]);
  const [filteredThreads, setFilteredThreads] = useState([]);
  const [unreadOnly, setUnreadOnly] = useState(Boolean(route.params?.filterUnread));

  const rtl = isRTL();
  const rowStyle = { flexDirection: rtl ? 'row-reverse' : 'row' };
  const alignText = rtl ? 'right' : 'left';

  const {
    data: userThreads,
    isLoading,
    refetch,
  } = useProviderGetThreads();

  const isFocused = useIsFocused();

  useEffect(() => {
    if (typeof route.params?.filterUnread === 'boolean') {
      setUnreadOnly(route.params.filterUnread);
    }
  }, [route.params?.filterUnread]);

  useEffect(() => {
    if (isFocused) refetch();
  }, [isFocused, refetch]);

  useEffect(() => {
    const threadsList = userThreads?.docs || userThreads?.threads || userThreads || [];
    setThreads(threadsList);
    setFilteredThreads(threadsList);
  }, [userThreads]);

  const threadMatchesUnread = (item) => {
    if (typeof item?.providerUnreadCount === 'number') return item.providerUnreadCount > 0;
    if (typeof item?.unreadCount === 'number') return item.unreadCount > 0;
    return Boolean(item?.hasUnread);
  };

  useEffect(() => {
    let base = threads;
    if (unreadOnly) {
      base = threads.filter(threadMatchesUnread);
    }

    if (search.trim() === '') {
      setFilteredThreads(base);
      return;
    }

    const searchLower = search.toLowerCase();
    const filtered = base.filter((item) => {
      const name = getPatientDisplayName(item.patient, rtl) || item.patientName || '';
      return name.toLowerCase().includes(searchLower);
    });
    setFilteredThreads(filtered);
  }, [search, threads, unreadOnly, rtl]);

  const openThread = (item) => {
    navigation.navigate('ChatDetails', { thread: item });
  };

  const renderItem = ({ item }) => {
    const patientName = getPatientDisplayName(item.patient, rtl) || item.patientName || pd.patient || 'Patient';
    const profileImageSource = item?.patient?.profileImage
      ? { uri: item.patient.profileImage }
      : ICONS.defaultAvatar;
    const preview = item?.lastMessage?.content || item?.lastMessage?.text || '';
    const time = item?.lastMessage?.createdAt || item?.updatedAt;

    return (
      <TouchableOpacity style={styles.msgCard} onPress={() => openThread(item)} activeOpacity={0.85}>
        <View style={[rowStyle, { alignItems: 'center' }]}>
          <View style={styles.avatarRing}>
            <Image source={profileImageSource} style={styles.avatar} />
          </View>
          <View style={[styles.msgContent, { alignItems: alignText === 'right' ? 'flex-end' : 'flex-start' }]}>
            <View style={[rowStyle, styles.msgHeader]}>
              <AppText variant="h3" style={{ textAlign: alignText }}>{patientName}</AppText>
              {time ? (
                <AppText variant="caption" muted style={styles.time}>
                  {daysAgo(time, t)}
                </AppText>
              ) : null}
            </View>
            {item.type ? (
              <AppText variant="caption" muted style={{ textAlign: alignText }}>{item.type}</AppText>
            ) : null}
            {preview ? (
              <AppText variant="body" muted numberOfLines={2} style={{ textAlign: alignText, marginTop: 4 }}>
                {preview}
              </AppText>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header title={pd.inboxTitle || 'Messages'} />
      <View style={styles.searchWrap}>
        <TextInput
          style={[styles.searchInput, { textAlign: alignText }]}
          placeholder={pd.searchPatients || 'Search patients'}
          placeholderTextColor={COLORS.gray500}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <View style={styles.listPad}>
          {[1, 2, 3].map((k) => (
            <View key={k} style={styles.skeletonCard}>
              <Skeleton width={48} height={48} borderRadius={24} />
              <Skeleton width="70%" height={16} style={{ marginTop: SPACING.md }} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredThreads}
          keyExtractor={(item) => String(item._id || item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={(
            <EmptyState
              title={pd.noMessages || 'No messages yet'}
              subtitle={pd.noMessagesHint || 'Patient conversations will appear here'}
            />
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchWrap: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  searchInput: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
  },
  listPad: { paddingTop: SPACING.sm, paddingHorizontal: SPACING.lg },
  listContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: 100 },
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
  time: { marginStart: SPACING.sm },
});

export default ProviderInboxScreen;
