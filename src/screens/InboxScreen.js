import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Image, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation, useIsFocused, CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../store/LanguageContext';
import { useAuthStore } from '../store/authStore';
import Header from '../components/Header';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import { usePatientGetThreads } from '@api/services/Thread.Service';
import { useGetCompletedAppointments } from '@api/services/Appointment.Service';
import { daysAgo } from '@utils/timeFormatter';
import { wp, hp } from '@utils/responsive';
import { rtlRow, rtlLeft, rtlTextAlign, isRTL } from '@utils/rtlUtils';
import Icon from 'react-native-vector-icons/FontAwesome5';
import moment from 'moment';
import Skeleton from '../components/Skeleton';

const InboxScreen = () => {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const { isAuthenticated } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [threads, setThreads] = useState([]);
  const [filteredThreads, setFilteredThreads] = useState([]);
  const hasRedirected = useRef(false);

  const rowStyle = { flexDirection: isRTL() ? 'row-reverse' : 'row' };
  const alignText = { textAlign: isRTL() ? 'right' : 'left' };

  const {
    data: userThreads,
    error: userThreadsError,
    isLoading: userThreadsLoader,
    refetch
  } = usePatientGetThreads();

  // Fetch completed appointments to check 30-day restriction
  const { data: appointments } = useGetCompletedAppointments();

  // Check if provider has a completed appointment within the last 30 days
  const hasRecentAppointment = (providerId) => {
    // If appointments haven't loaded yet or no provider ID, allow messaging (optimistic)
    if (!appointments || appointments.length === 0 || !providerId) return true;

    const thirtyDaysAgo = moment().subtract(30, 'days').startOf('day');
    const today = moment().endOf('day');

    return appointments.some(apt => {
      // Get provider ID from appointment (handle different formats)
      const aptProviderId = apt.provider?._id || apt.provider?.id || apt.provider;
      const aptProviderIdStr = String(aptProviderId);
      const targetProviderIdStr = String(providerId);

      // Check if this appointment is with the same provider
      const isSameProvider = aptProviderIdStr === targetProviderIdStr;
      if (!isSameProvider) return false;

      // Check if appointment end time is within last 30 days
      const appointmentDate = moment(apt.endTime || apt.startTime);
      const isWithin30Days = appointmentDate.isSameOrAfter(thirtyDaysAgo) && appointmentDate.isSameOrBefore(today);

      return isWithin30Days;
    });
  };

  const isFocused = useIsFocused();

  // Refetch threads when screen comes into focus
  useEffect(() => {
    if (isFocused && isAuthenticated) {
      refetch();
    }
  }, [isFocused, refetch, isAuthenticated]);

  // Sync data from API
  useEffect(() => {
    if (userThreads && isAuthenticated) {
      // The API returns { threads: [...] } based on the old code analysis
      // Check if it's directly an array or an object with threads property
      const threadsList = userThreads.threads || userThreads || [];
      setThreads(threadsList);
      setFilteredThreads(threadsList);
    }
    if (userThreadsError) {
    }
  }, [userThreads, userThreadsError, isAuthenticated]);

  // Search Logic
  useEffect(() => {
    if (search.trim() === '') {
      setFilteredThreads(threads);
    } else {
      const filtered = threads.filter(item => {
        const fullName = item?.provider?.fullName || '';
        const fullNameArabic = item?.provider?.fullNameArabic || '';
        const fullNameEnglish = item?.provider?.fullNameEnglish || '';
        const searchLower = search.toLowerCase();
        return fullName.toLowerCase().includes(searchLower) ||
               fullNameArabic.toLowerCase().includes(searchLower) ||
               fullNameEnglish.toLowerCase().includes(searchLower);
      });
      setFilteredThreads(filtered);
    }
  }, [search, threads]);

  // Check authentication - redirect to login if not authenticated
  // Delay navigation.reset to let Fabric finish mounting — prevents "child already has a parent" crash
  React.useEffect(() => {
    if (!isAuthenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      const timer = setTimeout(() => {
        navigation.reset({
          index: 1,
          routes: [
            { name: 'Main', state: { routes: [{ name: 'HomeTab' }] } },
            {
              name: 'LoginScreen',
              params: {
                targetScreen: 'InboxTab',
                targetParams: {}
              }
            }
          ],
        });
      }, 100);
      return () => clearTimeout(timer);
    }
    if (isAuthenticated) {
      hasRedirected.current = false;
    }
  }, [isAuthenticated, navigation]);

  // Return loading if not authenticated - AFTER all hooks
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Header title={t.inbox?.title || "Inbox"} showBack onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  const renderItem = ({ item }) => {
    // Get provider image or use default user icon
    const profileImageSource = item?.provider?.profileImage
      ? { uri: item.provider.profileImage }
      : (ICONS.user || ICONS.defaultAvatar);

    // Check if thread is expired (no completed appointment within 30 days)
    const providerId = item?.provider?._id || item?.provider?.id;
    const isExpired = !hasRecentAppointment(providerId);

    return (
      <TouchableOpacity
        style={styles.msgCard}
        onPress={() => navigation.navigate('ChatDetails', { thread: item })}
      >
        <View style={[rowStyle, { alignItems: 'center' }]}>
          <Image
            source={profileImageSource}
            style={styles.avatar}
          />
        <View style={{ flex: 1, marginHorizontal: 12, alignItems: isRTL() ? 'flex-end' : 'flex-start' }}>
          <View style={[rowStyle, { justifyContent: 'space-between', width: '100%', alignItems: 'center' }]}>
            <View style={[rowStyle, { alignItems: 'center', flex: 1 }]}>
              <Text style={styles.name}>{isRTL() ? (item?.provider?.fullNameArabic || item?.provider?.fullName || 'مزود غير معروف') : (item?.provider?.fullNameEnglish || item?.provider?.fullName || 'Unknown Provider')}</Text>
              {isExpired && (
                <View style={styles.expiredBadge}>
                  <Icon name="clock" size={10} color={COLORS.gray500} />
                </View>
              )}
            </View>
            <Text style={styles.time}>{daysAgo(item?.updatedAt || item?.createdAt)}</Text>
          </View>

          <Text style={styles.type}>
            {item?.type === 'General'
              ? (isRTL() ? 'عام' : 'General')
              : (item?.type || (isRTL() ? 'عام' : 'General'))
            }
          </Text>

          {(item?.lastMessage?.attachment?.fileId || item?.lastMessage?.attachment?.url) ? (
            <View style={[styles.fileChip, rowStyle]}>
              <Image source={ICONS.file} style={{ width: 12, height: 12, tintColor: COLORS.gray700, marginHorizontal: 4 }} />
              <Text style={{ fontSize: 12, color: COLORS.textPrimary }}>
                 {t.attachment || 'Attachment'}
              </Text>
            </View>
          ) : (
            <Text numberOfLines={1} style={[styles.msgPreview, alignText]}>
              {item?.lastMessage?.body || t.noMessages || 'No messages yet'}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header title={t.inbox} showProfile={false} />
      <View style={styles.content}>

        {/* Search Bar */}
        <View style={[styles.searchBox, rowStyle]}>
          <Image source={ICONS.search} style={styles.searchIcon} />
          <TextInput
            placeholder={t.searchMessages}
            style={[styles.input, alignText]}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={COLORS.gray500}
          />
        </View>

        {userThreadsLoader ? (
            <View style={{ padding: 16 }}>
                {[0, 1, 2, 3].map(i => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 15, backgroundColor: '#fff', borderRadius: 16, marginBottom: 10 }}>
                        <Skeleton width={45} height={45} style={{ borderRadius: 22.5, marginRight: 12 }} />
                        <View style={{ flex: 1 }}>
                            <Skeleton width="70%" height={13} style={{ marginBottom: 8 }} />
                            <Skeleton width="85%" height={11} />
                        </View>
                    </View>
                ))}
            </View>
        ) : filteredThreads.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: COLORS.gray500 }}>{t.noMessagesFound || 'No messages found'}</Text>
            </View>
        ) : (
            <FlatList
            data={filteredThreads}
            renderItem={renderItem}
            keyExtractor={(item, index) => item._id?.toString() || index.toString()}
            contentContainerStyle={{ paddingTop: 10, paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            />
        )}
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 30 + insets.bottom }, isRTL() ? { left: 20 } : { right: 20 }]}
        onPress={() => navigation.navigate('NewMessage')}
      >
        <Image source={ICONS.plus} style={styles.fabIcon} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, flex: 1 },

  searchBox: { backgroundColor: COLORS.white, borderRadius: 12, paddingHorizontal: 15, height: 50, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: COLORS.gray200 },
  searchIcon: { width: 20, height: 20, tintColor: COLORS.gray500, marginHorizontal: 5 },
  input: { flex: 1, height: '100%', color: COLORS.textPrimary },

  fab: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 4 } },
  fabIcon: { width: 24, height: 24, tintColor: 'white' },

  // List Styles
  msgCard: { backgroundColor: COLORS.white, padding: 15, borderRadius: 16, marginBottom: 12, elevation: 2, shadowColor: COLORS.shadow, shadowOpacity: 0.03 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.gray200 },
  name: { fontWeight: 'bold', fontSize: 15, color: COLORS.textPrimary },
  type: { fontSize: 11, color: COLORS.primary, marginBottom: 2, fontWeight: '600' },
  msgPreview: { fontSize: 13, color: COLORS.gray600, marginTop: 2 },
  time: { fontSize: 11, color: COLORS.gray500 },

  fileChip: { backgroundColor: COLORS.offWhite, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4, alignItems: 'center' },

  // Expired thread badge
  expiredBadge: {
    marginLeft: 6,
    backgroundColor: COLORS.gray100,
    borderRadius: 10,
    padding: 4,
  },
});

export default InboxScreen;