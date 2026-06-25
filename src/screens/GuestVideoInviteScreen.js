import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import moment from 'moment-timezone';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useCheckRoomId } from '../api/services/Appointment.Service';
import { useAuthStore } from '../store/authStore';
import { canAuthenticatedUserJoinMobileVideo } from '../utils/videoAccess';
import { getUserId } from '../utils/userId';
import { pauseSessionTimeout, resumeSessionTimeout } from '../utils/sessionPause';
import COLORS from '../constants/colors';

const JOIN_WINDOW_MINS = 10;
const SESSION_EXIT_GRACE_MINS = 15;

const GuestVideoInviteScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const roomId = route.params?.roomId;
  const presetName = route.params?.name || '';

  const { user, isAuthenticated } = useAuthStore();
  const [nowTick, setNowTick] = useState(Date.now());

  const { data: roomCheck, isLoading, error: roomError } = useCheckRoomId(roomId);

  useEffect(() => {
    pauseSessionTimeout();
    return () => resumeSessionTimeout();
  }, []);

  const room = roomCheck?.room;

  const timing = useMemo(() => {
    if (!room?.startTime || !room?.endTime) return null;

    const clientTz = room.clientTz || moment.tz.guess();
    const start = moment.tz(room.startTime, clientTz);
    const end = moment.tz(room.endTime, clientTz);
    const joinAllowed = start.clone().subtract(JOIN_WINDOW_MINS, 'minutes');
    const hardEnd = end.clone().add(SESSION_EXIT_GRACE_MINS, 'minutes');
    const now = moment.tz(clientTz);

    return {
      start,
      end,
      joinAllowed,
      hardEnd,
      now,
      isExpired: now.isAfter(hardEnd),
      canJoin: now.isSameOrAfter(joinAllowed) && now.isBefore(hardEnd),
      waiting: now.isBefore(joinAllowed),
      secondsUntilJoin: Math.max(0, joinAllowed.diff(now, 'seconds')),
    };
  }, [room, nowTick]);

  useEffect(() => {
    if (!timing?.waiting) return undefined;
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [timing?.waiting]);

  // Login required before joining any video session from the app
  useEffect(() => {
    if (isLoading || !roomId) return;
    if (roomError || !room || timing?.isExpired) return;
    if (isAuthenticated) return;

    const timer = setTimeout(() => {
      if (useAuthStore.getState().isAuthenticated) return;

      navigation.replace('LoginScreen', {
        targetScreen: 'GuestVideoInvite',
        targetParams: { roomId, name: presetName },
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [
    isLoading,
    isAuthenticated,
    roomError,
    room,
    roomId,
    timing?.isExpired,
    navigation,
    presetName,
  ]);

  // Block staff; send authenticated patients to the video room when the join window opens
  useEffect(() => {
    if (!isAuthenticated || !user || !room || !roomId || !timing) return;

    if (!canAuthenticatedUserJoinMobileVideo(user)) {
      Alert.alert(
        t('auth.otp.accessDenied', 'Access Denied'),
        t('videoConsultation.providersUseWeb',
          'Providers must join video sessions from the Spectrum website at the clinic, not the mobile app.'),
        [{ text: t('common.ok', 'OK'), onPress: () => navigation.replace('Main') }],
      );
      return;
    }

    if (!timing.canJoin) return;

    const authUserId = getUserId(user);
    if (!authUserId) return;

    navigation.replace('VideoConsultation', {
      meetingRoomId: roomId,
      userID: String(authUserId),
      userName: user.fullName || user.fullNameArabic || user.fullNameEnglish || 'Patient',
      isGuest: false,
    });
  }, [isAuthenticated, user, room, roomId, timing, navigation, t]);

  const formatCountdown = useCallback((totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }, []);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.subtitle}>
          {t('auth.loginRequiredForSession', 'Please log in to join this session.')}
        </Text>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.subtitle}>
          {t('videoConsultation.validatingRoom', 'Validating room...')}
        </Text>
      </SafeAreaView>
    );
  }

  if (roomError || !room || timing?.isExpired) {
    return (
      <SafeAreaView style={styles.container}>
        <Icon name="error-outline" size={56} color="#EF4444" />
        <Text style={styles.title}>
          {t('videoConsultation.roomExpired', 'Room Expired')}
        </Text>
        <Text style={styles.subtitle}>
          {t('videoConsultation.consultationEnded', 'This consultation has ended.')}
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Main')}>
          <Text style={styles.primaryBtnText}>
            {t('videoConsultation.goBack', 'Go Back')}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (timing?.waiting) {
    return (
      <SafeAreaView style={styles.container}>
        <Icon name="schedule" size={56} color={COLORS.primary} />
        <Text style={styles.title}>
          {t('videoConsultation.meetingOpensIn', 'Meeting room opens in')}
        </Text>
        <Text style={styles.countdown}>
          {formatCountdown(timing.secondsUntilJoin)}
        </Text>
        <Text style={styles.subtitle}>
          {t('videoConsultation.joinBeforeStart', 'You can join 10 minutes before the scheduled start time.')}
        </Text>
        {room?.provider?.fullName && (
          <Text style={[styles.providerLine, { textAlign: isRTL ? 'right' : 'left' }]}>
            {room.provider.fullName}
          </Text>
        )}
        <Text style={styles.scheduled}>
          {t('videoConsultation.scheduledFor', 'Scheduled for')}{' '}
          {timing.start.format('MMM D, YYYY h:mm A')}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.subtitle}>
        {t('videoConsultation.connecting', 'Connecting to your session...')}
      </Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  countdown: {
    color: COLORS.primary,
    fontSize: 36,
    fontWeight: '700',
    marginVertical: 16,
  },
  scheduled: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
  providerLine: {
    color: '#CBD5E1',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 16,
    width: '100%',
    maxWidth: 320,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 20,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GuestVideoInviteScreen;
