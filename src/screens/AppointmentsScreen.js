import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, RefreshControl, ActivityIndicator, Linking, Alert, Platform, DeviceEventEmitter } from 'react-native';
import { useNavigation, CommonActions, useFocusEffect, useRoute } from '@react-navigation/native';
import { useLanguage } from '../store/LanguageContext';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import Header from '../components/Header';
import Skeleton from '../components/Skeleton';
import { EmptyState, SegmentedTabs } from '../components/ui';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import { SPACING, RADIUS, SHADOWS, cardBorder } from '../theme';
import moment from 'moment-timezone';
import {
  useGetUpcomingAppointments,
  useGetPendingAppointmentsGroupedByDoctor,
} from '../api/services/Appointment.Service';
import { showToast } from '../components/InAppToast';
import socketService from '../utils/socket';
import { filterUpcomingAppointments } from '../utils/appointmentFilters';
import { getUserId } from '../utils/userId';
import { canAuthenticatedUserJoinMobileVideo } from '../utils/videoAccess';
import { usePreSessionJoin } from '../context/PreSessionJoinContext';
import { interpolate } from '../utils/localeHelpers';
import {
  openAppleCalendarWithEvent,
  openGoogleCalendarWithEvent,
} from '../utils/calendarEvent';
import useGlassTabBarInset from '../navigation/useGlassTabBarInset';

const CountdownTimer = ({ startTime, clientTz, label }) => {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const update = () => {
      const now = moment.tz(clientTz);
      const start = moment.tz(startTime, clientTz);
      const diff = start.diff(now, 'seconds');
      if (diff > 0) {
        setTimeLeft({ minutes: Math.floor(diff / 60), seconds: diff % 60 });
      } else {
        setTimeLeft(null);
      }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [startTime, clientTz]);

  if (!timeLeft) return null;

  return (
    <View style={countdownStyles.container}>
      <Text style={countdownStyles.text}>
        ⏱ {label || ''} {timeLeft.minutes}m {timeLeft.seconds}s
      </Text>
    </View>
  );
};

const countdownStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.actionBg,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.actionBorder,
  },
  text: {
    color: COLORS.actionText,
    fontSize: 13,
    fontWeight: '600',
  },
});

const AppointmentsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t, isRTL } = useLanguage();
  const { requestJoinSession } = usePreSessionJoin();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState(route.params?.initialTab || 'upcoming');
  const [refreshing, setRefreshing] = useState(false);
  const [callEndedRooms, setCallEndedRooms] = useState(new Set());
  const [nowTick, setNowTick] = useState(0);
  const attachedRef = useRef(false);
  const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
  const tabBarInset = useGlassTabBarInset();

  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  // Real API calls - must be called before any conditional returns
  const {
    data: upcomingAppointmentsRaw,
    isLoading: upcomingLoading,
    isError: upcomingError,
    refetch: refetchUpcoming,
  } = useGetUpcomingAppointments();

  const {
    data: pendingAppointments,
    isLoading: pendingLoading,
    isError: pendingError,
    refetch: refetchPending,
  } = useGetPendingAppointmentsGroupedByDoctor();

  // State for filtered appointments (to avoid re-filtering on every render)
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);

  // Update filtered appointments when raw data changes
  useEffect(() => {
    if (upcomingAppointmentsRaw) {
      setUpcomingAppointments(filterUpcomingAppointments(upcomingAppointmentsRaw));
    }
  }, [upcomingAppointmentsRaw, nowTick]);

  // Re-evaluate join windows and expiry every 30 seconds
  useEffect(() => {
    const filterTimer = setInterval(() => {
      setNowTick(Date.now());
      setUpcomingAppointments((prev) => {
        if (!prev || prev.length === 0) return prev;
        const filtered = filterUpcomingAppointments(prev);
        return filtered.length !== prev.length ? filtered : prev;
      });
    }, 30000);

    return () => clearInterval(filterTimer);
  }, []);

  const authUserId = getUserId(user);

  // Socket listeners for real-time updates (connection handled globally in App.tsx)
  useEffect(() => {
    if (!authUserId || !isAuthenticated) return;

    const handleCallEnded = (data) => {
        const isProviderEndedCall = data?.message?.includes('provider') || data?.message?.includes('doctor');

        if (isProviderEndedCall && data?.roomId) {
          setCallEndedRooms(prev => new Set([...prev, data.roomId]));
          // Refetch appointments to update UI
          refetchUpcoming();
        }
      };

      // Handle appointment rejection in real-time
      const handleAppointmentRejected = (data) => {
        refetchUpcoming();
        refetchPending();
        queryClient.invalidateQueries({ queryKey: ['upcomingAppointments'] });
        queryClient.invalidateQueries({ queryKey: ['pendingAppointmentsGrouped'] });
        showToast({
          variant: 'info',
          title: t.appointments?.rejectedTitle || 'Appointment update',
          body: data?.message || t.appointments?.rejectedBody || 'An appointment was rejected.',
        });
      };

      const handleAppointmentCancelled = (data) => {
        refetchUpcoming();
        refetchPending();
        queryClient.invalidateQueries({ queryKey: ['upcomingAppointments'] });
        queryClient.invalidateQueries({ queryKey: ['pendingAppointmentsGrouped'] });
        showToast({
          variant: 'info',
          title: t.appointments?.cancelledTitle || 'Appointment cancelled',
          body: data?.message || t.appointments?.cancelledBody || 'An appointment was cancelled.',
        });
      };

      const handleAppointmentStatusChanged = (data) => {
        refetchUpcoming();
        refetchPending();
        queryClient.invalidateQueries({ queryKey: ['upcomingAppointments'] });
        queryClient.invalidateQueries({ queryKey: ['pendingAppointmentsGrouped'] });
        showToast({
          variant: 'success',
          title: t.appointments?.statusChangedTitle || 'Appointment updated',
          body: data?.message || t.appointments?.statusChangedBody || 'Your appointment status changed.',
        });
      };

      const handleAppointmentApproved = (data) => {
        refetchUpcoming();
        refetchPending();
        queryClient.invalidateQueries({ queryKey: ['upcomingAppointments'] });
        queryClient.invalidateQueries({ queryKey: ['pendingAppointmentsGrouped'] });
        showToast({
          variant: 'success',
          title: t.appointments?.approvedTitle || 'Appointment approved',
          body: data?.message || t.appointments?.approvedBody || 'Your provider approved your appointment.',
        });
      };

      const handleAppointmentCreated = (data) => {
        refetchUpcoming();
        refetchPending();
        queryClient.invalidateQueries({ queryKey: ['upcomingAppointments'] });
        queryClient.invalidateQueries({ queryKey: ['pendingAppointmentsGrouped'] });
        showToast({
          variant: 'success',
          title: t.appointments?.createdTitle || 'Appointment booked',
          body: data?.message || t.appointments?.createdBody || 'Your appointment was created.',
        });
      };

    const attachListeners = () => {
      if (attachedRef.current) return;
      attachedRef.current = true;
      socketService.on('callEnded', handleCallEnded);
      socketService.on('appointmentRejected', handleAppointmentRejected);
      socketService.on('appointmentCancelled', handleAppointmentCancelled);
      socketService.on('appointmentStatusChanged', handleAppointmentStatusChanged);
      socketService.on('appointmentApproved', handleAppointmentApproved);
      socketService.on('appointmentCreated', handleAppointmentCreated);
    };

    attachListeners();
    const connectSub = DeviceEventEmitter.addListener('socket:connected', attachListeners);

    return () => {
      connectSub.remove();
      attachedRef.current = false;
      socketService.off('callEnded', handleCallEnded);
      socketService.off('appointmentRejected', handleAppointmentRejected);
      socketService.off('appointmentCancelled', handleAppointmentCancelled);
      socketService.off('appointmentStatusChanged', handleAppointmentStatusChanged);
      socketService.off('appointmentApproved', handleAppointmentApproved);
      socketService.off('appointmentCreated', handleAppointmentCreated);
    };
  }, [authUserId, isAuthenticated, refetchUpcoming, refetchPending, queryClient]);

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchUpcoming(), refetchPending()]);
    } catch (error) {
    } finally {
      setRefreshing(false);
    }
  };

  // Refetch appointments when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated) {
        refetchUpcoming();
        refetchPending();
      }
    }, [isAuthenticated, refetchUpcoming, refetchPending])
  );

  // Get data based on active tab
  const filteredData = activeTab === 'upcoming'
    ? (upcomingAppointments || [])
    : (pendingAppointments || []);

  const isLoading = activeTab === 'upcoming' ? upcomingLoading : pendingLoading;
  const hasLoadError = activeTab === 'upcoming' ? upcomingError : pendingError;

  const handleRetryLoad = () => {
    if (activeTab === 'upcoming') {
      refetchUpcoming();
    } else {
      refetchPending();
    }
  };

  const navigateToCheckout = (appointment) => {
    const appointmentId = appointment.appointmentId || appointment._id || appointment.id;
    if (!appointmentId) {
      Alert.alert(t.appointments?.error || 'Error', 'Appointment ID not found');
      return;
    }
    navigation.navigate('Checkout', { id: appointmentId });
  };

  const handlePay = (item) => {
    const appointments = item.appointments || [];

    if (appointments.length === 0) {
      Alert.alert(t.appointments?.error || 'Error', 'No appointment found to pay for');
      return;
    }

    if (appointments.length === 1) {
      navigateToCheckout(appointments[0]);
      return;
    }

    Alert.alert(
      t.appointments?.selectAppointmentTitle || 'Select appointment',
      t.appointments?.selectAppointmentToPay || 'Choose which appointment to pay for',
      [
        ...appointments.map((appointment) => ({
          text: moment(appointment.startTime).format('MMM D h:mm A'),
          onPress: () => navigateToCheckout(appointment),
        })),
        { text: t.common?.cancel || 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handlePayAppointment = (appointment) => {
    navigateToCheckout(appointment);
  };

  const handleJoinCall = (item) => {
    if (!item?.roomId) return;

    if (!canAuthenticatedUserJoinMobileVideo(user)) {
      Alert.alert(
        t.auth?.otp?.accessDenied || 'Access Denied',
        t.videoConsultation?.providersUseWeb
          || 'Providers must join video sessions from the Spectrum website at the clinic, not the mobile app.',
      );
      return;
    }

    const loggedInUserId = getUserId(user);
    if (!loggedInUserId) return;

    requestJoinSession({ appointment: item });
  };

  const handleAddToCalendar = async (item) => {
    try {
      const doctorName = item?.provider?.fullName || 'Doctor';
      const serviceType = item?.providerService?.name || item?.reason || 'Medical Consultation';
      const clientTz = item.clientTz || moment.tz.guess();

      // Parse times
      const startTime = moment.tz(item.startTime, clientTz);
      const endTime = moment.tz(item.endTime, clientTz);

      // Event details
      const title = `${t.appointments?.appointmentWith || 'Appointment with'} ${doctorName}`;
      const notes = `${serviceType}\n\n${t.appointments?.videoConsultation || 'Video Consultation'}\n${t.appointments?.roomId || 'Room ID'}: ${item.roomId || 'N/A'}`;
      const location = t.appointments?.onlineConsultation || 'Online Consultation';

      // Format dates for calendar URL
      const startDate = startTime.utc().format('YYYYMMDDTHHmmss') + 'Z';
      const endDate = endTime.utc().format('YYYYMMDDTHHmmss') + 'Z';

      if (Platform.OS === 'ios') {
        Alert.alert(
          t.appointments?.addToCalendar || 'Add to Calendar',
          t.appointments?.chooseCalendarApp || 'Choose calendar app',
          [
            {
              text: t.appointments?.appleCalendar || 'Apple Calendar',
              onPress: async () => {
                try {
                  await openAppleCalendarWithEvent({
                    title,
                    startTime,
                    endTime,
                    notes,
                    location,
                  });
                } catch {
                  Alert.alert(
                    t.common?.error || 'Error',
                    t.appointments?.calendarAddFailed || 'Could not add to calendar',
                  );
                }
              },
            },
            {
              text: t.appointments?.googleCalendar || 'Google Calendar',
              onPress: async () => {
                try {
                  await openGoogleCalendarWithEvent({
                    title,
                    startTime,
                    endTime,
                    notes,
                    location,
                  });
                } catch {
                  Alert.alert(
                    t.common?.error || 'Error',
                    t.appointments?.calendarAddFailed || 'Could not add to calendar',
                  );
                }
              },
            },
            {
              text: t.common?.cancel || 'Cancel',
              style: 'cancel',
            },
          ]
        );
      } else {
        // Android: Use intent or Google Calendar
        Alert.alert(
          t.appointments?.addToCalendar || 'Add to Calendar',
          t.appointments?.chooseCalendarApp || 'Choose calendar app',
          [
            {
              text: t.appointments?.deviceCalendar || 'Device Calendar',
              onPress: async () => {
                // Try to open device calendar with intent
                const androidIntent = `intent://calendar/event?action=INSERT&title=${encodeURIComponent(title)}&begin=${startTime.valueOf()}&end=${endTime.valueOf()}&description=${encodeURIComponent(notes)}#Intent;scheme=content;package=com.google.android.calendar;end`;
                const canOpen = await Linking.canOpenURL(androidIntent);
                if (canOpen) {
                  Linking.openURL(androidIntent);
                } else {
                  // Fallback to Google Calendar web
                  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(notes)}&location=${encodeURIComponent(location)}`;
                  Linking.openURL(googleUrl);
                }
              },
            },
            {
              text: t.appointments?.googleCalendar || 'Google Calendar',
              onPress: () => {
                const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(notes)}&location=${encodeURIComponent(location)}`;
                Linking.openURL(googleUrl);
              },
            },
            {
              text: t.common?.cancel || 'Cancel',
              style: 'cancel',
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        t.common?.error || 'Error',
        t.appointments?.calendarError || 'Could not add to calendar'
      );
    }
  };

  const handleCancel = (item) => {
    let appointment;

    if (item.appointments && Array.isArray(item.appointments) && item.appointments.length > 0) {
      appointment = item.appointments[0];
    } else {
      appointment = item;
    }

    if (!appointment) {
      Alert.alert(t.appointments?.error || 'Error', 'Appointment not found');
      return;
    }

    navigation.navigate('CancelAppointment', { appointment });
  };

  const handleReschedule = (item) => {
    // Navigate to reschedule screen with appointment data
    navigation.navigate('RescheduleAppointment', {
      appointment: item,
      onRescheduleSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['upcomingAppointments'] });
        refetchUpcoming();
      }
    });
  };

  const renderCard = ({ item }) => {
    // Handle both upcoming appointments (single) and pending appointments (grouped)
    const isUpcoming = activeTab === 'upcoming';

    // Extract data based on type - use bilingual names
    const doctorName = isUpcoming
      ? (isRTL
          ? (item?.provider?.fullNameArabic || item?.provider?.fullName)
          : (item?.provider?.fullNameEnglish || item?.provider?.fullName))
      : (isRTL
          ? (item?.providerNameArabic || item?.providerName)
          : (item?.providerNameEnglish || item?.providerName));
    const doctorImage = isUpcoming ? item?.provider?.profileImage : item?.profileImage;
    const appointmentReason = isUpcoming ? item?.reason : (item?.appointments?.[0]?.reason || '');
    const serviceType = isUpcoming
      ? (item?.providerService?.name || item?.service?.name || '')
      : (item?.appointments?.[0]?.service?.name || '');

    // Date/time formatting - use client timezone for times and UTC for dates (same as old app)
    let formattedDate = '';
    let formattedTime = '';

    if (isUpcoming && item?.startTime) {
      // Use UTC for date to prevent timezone shift
      formattedDate = moment.utc(item.startTime).format('MMM D, YYYY');

      // Backend already converts times to user's current timezone
      const startTime = moment(item.startTime).format('h:mm A');
      const endTime = moment(item.endTime).format('h:mm A');
      formattedTime = `${startTime} - ${endTime}`;
    } else if (!isUpcoming && item?.appointments?.[0]) {
      // For pending appointments
      const firstAppointment = item.appointments[0];

      // Use UTC for date to prevent timezone shift
      formattedDate = moment.utc(firstAppointment.startTime).format('MMM D, YYYY');
      // Backend already converts times to user's current timezone
      formattedTime = moment(firstAppointment.startTime).format('h:mm A');
    }

    // Video call logic for upcoming appointments
    let showJoinButton = false;
    let isRoomExpired = false;
    let canReschedule = false;
    let canCancel = false;
    let timeUntilStart = null;
    let showCountdown = false;
    let startsInLabel = null;
    let isBeforeStartGlobal = false;

    if (isUpcoming && item?.startTime && item?.endTime) {
      const clientTz = item.clientTz || moment.tz.guess();

      const appointmentStart = moment.tz(item.startTime, clientTz);
      const appointmentEnd = moment.tz(item.endTime, clientTz);
      const joinWindowStart = appointmentStart.clone().subtract(10, 'minutes');

      const now = moment.tz(clientTz);

      const isBeforeStart = now.isBefore(appointmentStart);
      isBeforeStartGlobal = isBeforeStart;
      const isInJoinWindow = now.isSameOrAfter(joinWindowStart) && now.isSameOrBefore(appointmentStart);

      const isAfterJoinWindowStart = now.isSameOrAfter(joinWindowStart);
      const isBeforeOrAtEndTime = now.isSameOrBefore(appointmentEnd);
      showJoinButton = isAfterJoinWindowStart && isBeforeOrAtEndTime;

      isRoomExpired = now.isAfter(appointmentEnd);

      // Countdown shown in the 10-minute pre-start join window
      if (isInJoinWindow && isBeforeStart) {
        const diff = appointmentStart.diff(now, 'seconds');
        timeUntilStart = { minutes: Math.floor(diff / 60), seconds: diff % 60 };
        showCountdown = true;
      }

      // "Starts in Xh Ym" badge for appointments 10 min–24 h away (patient knows when to expect it)
      if (isBeforeStart && !isInJoinWindow) {
        const minsUntil = appointmentStart.diff(now, 'minutes');
        if (minsUntil <= 1440) {
          const h = Math.floor(minsUntil / 60);
          const m = minsUntil % 60;
          startsInLabel = h > 0 ? `${h}h ${m}m` : `${m}m`;
        }
      }

      const sixHoursFromNow = now.clone().add(6, 'hours');
      canReschedule = appointmentStart.isAfter(sixHoursFromNow)
        && (item.reschedulingAttempts || 0) < 3;

      canCancel = appointmentStart.isAfter(now) && now.isBefore(joinWindowStart);
    }

    const isRescheduledUnpaid = isUpcoming
      && item.status === 'Rescheduled'
      && item.paymentStatus !== 'Completed'
      && item.expiresAt;

    // Check if call was ended by provider
    const callWasEnded = callEndedRooms.has(item?.roomId);

    // Check if appointment needs verification or is not confirmed
    const needsVerification = isUpcoming && (
      item?.approvedByDoctor === false ||
      item?.paymentStatus !== 'Completed' ||
      item?.status === 'Pending'
    ) && !isRescheduledUnpaid;

    return (
      <View style={styles.card}>
        <View style={[styles.cardHeader, rowStyle]}>
          <Image
            source={doctorImage ? { uri: doctorImage } : ICONS.defaultAvatar}
            style={styles.avatar}
          />
          <View style={{ flex: 1, marginHorizontal: 12, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={styles.docName}>{doctorName || 'Doctor Name'}</Text>
            <Text style={styles.docType}>{serviceType || appointmentReason || 'Consultation'}</Text>
            <View>
              <Text style={styles.dateTime}>
                {formattedDate} {formattedTime ? `• ${formattedTime}` : ''}
              </Text>
              {(isUpcoming && item?.clientTz) && (
                <Text style={styles.timezoneText}>
                  🌍 {item.clientTz.replace(/_/g, ' ')}
                </Text>
              )}
              {(!isUpcoming && item?.appointments?.[0]?.clientTz) && (
                <Text style={styles.timezoneText}>
                  🌍 {item.appointments[0].clientTz.replace(/_/g, ' ')}
                </Text>
              )}
            </View>
          </View>
          <View style={[styles.badge, {
            backgroundColor: needsVerification ? COLORS.actionBg : (isUpcoming ? COLORS.primaryLight : COLORS.surfaceMuted),
            borderWidth: 1,
            borderColor: needsVerification ? COLORS.actionBorder : COLORS.primaryMuted,
          }]}>
            <Text style={{
              color: needsVerification ? COLORS.actionText : (isUpcoming ? COLORS.primaryDark : COLORS.warning),
              fontSize: 10,
              fontWeight: '700',
            }}>
              {isUpcoming
                ? (needsVerification ? (t.appointments?.drApprovalNeeded || 'Dr Approval Needed') : (t.appointments?.confirmed || 'Confirmed'))
                : (t.appointments?.pendingStatus || 'Pending')
              }
            </Text>
          </View>
        </View>

        {/* Rescheduled — payment required before join */}
        {isRescheduledUnpaid && (
          <TouchableOpacity
            style={styles.rescheduledPayBanner}
            onPress={() => navigation.navigate('Checkout', {
              id: item._id || item.id || item.appointmentId,
            })}
          >
            <Text style={styles.rescheduledPayText}>
              {interpolate(t.appointments?.paymentDeadlineBanner || t.home?.paymentDeadlineBanner, {
                time: moment(item.expiresAt).format('h:mm A'),
              })}
            </Text>
          </TouchableOpacity>
        )}

        {/* "Starts in Xh Ym" badge — visible before the 10-min join window opens */}
        {isUpcoming && startsInLabel && !needsVerification && (
          <View style={styles.startsInBadge}>
            <Text style={styles.startsInText}>
              ⏰ {t.appointments?.startsIn || 'Starts in'} {startsInLabel}
            </Text>
          </View>
        )}

        {/* --- UPCOMING ACTIONS --- */}
        {isUpcoming && showJoinButton && !isRoomExpired && !callWasEnded && !needsVerification && (
          <View style={{ marginTop: 15 }}>
            <TouchableOpacity
              style={styles.joinBtn}
              onPress={() => handleJoinCall(item)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t.appointments?.joinVideoCall || t.appointments?.joinCall || 'Join Call'}
            >
              <Text style={styles.joinBtnText}>
                {isBeforeStartGlobal
                  ? (t.appointments?.joinWaitingRoom || 'Join Waiting Room')
                  : (t.appointments?.joinCall || 'Join Call')}
              </Text>
            </TouchableOpacity>

            {showCountdown && (
              <CountdownTimer
                startTime={item.startTime}
                clientTz={item.clientTz || moment.tz.guess()}
                label={t.appointments?.appointmentStartsIn || 'Appointment starts in'}
              />
            )}

            {isBeforeStartGlobal && showCountdown && (
              <Text style={styles.earlyJoinNote}>
                {t.appointments?.earlyJoinNote || 'You\'re in the waiting room — the provider will join at appointment time'}
              </Text>
            )}

            <View style={[styles.actionRow, rowStyle, { marginTop: 10, flexWrap: 'wrap', gap: 8 }]}>
              {canCancel && (
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => handleCancel(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>
                    {t.appointments?.cancel || 'Cancel'}
                  </Text>
                </TouchableOpacity>
              )}

              {canReschedule && (
                <TouchableOpacity
                  style={styles.rescheduleBtn}
                  onPress={() => handleReschedule(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.rescheduleBtnText}>
                    {t.appointments?.reschedule || 'Reschedule'}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.calendarBtn}
                onPress={() => handleAddToCalendar(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.calendarBtnText}>
                  📅 {t.appointments?.addToCalendar || 'Add to Calendar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isUpcoming && (!showJoinButton || isRoomExpired || callWasEnded || needsVerification) && (
          <View style={[styles.actionRow, rowStyle, { marginTop: 15, flexWrap: 'wrap', gap: 8 }]}>
            {canCancel && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => handleCancel(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>
                  {t.appointments?.cancel || 'Cancel'}
                </Text>
              </TouchableOpacity>
            )}

            {canReschedule && (
              <TouchableOpacity
                style={styles.rescheduleBtn}
                onPress={() => handleReschedule(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.rescheduleBtnText}>
                  {t.appointments?.reschedule || 'Reschedule'}
                </Text>
              </TouchableOpacity>
            )}

            {!isRoomExpired && (
              <TouchableOpacity
                style={styles.calendarBtn}
                onPress={() => handleAddToCalendar(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.calendarBtnText}>
                  📅 {t.appointments?.addToCalendar || 'Add to Calendar'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {isUpcoming && callWasEnded && (
          <Text style={{ color: COLORS.danger, fontSize: 12, fontStyle: 'italic', marginTop: 10, textAlign: isRTL ? 'right' : 'left' }}>
            {t.appointments?.callEndedByProvider || 'Call ended by provider'}
          </Text>
        )}

        {/* --- PENDING ACTIONS --- */}
        {!isUpcoming && (
          <View style={{ marginTop: 15 }}>
            {(item.appointments || []).length > 1 ? (
              <>
                <Text style={[styles.pendingListTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {t.appointments?.pendingAppointmentsCount || 'Appointments to confirm'}
                  {' '}({item.appointments.length})
                </Text>
                {(item.appointments || []).map((appointment, index) => (
                  <View key={appointment.appointmentId || appointment._id || appointment.id || index} style={[styles.pendingApptRow, rowStyle]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pendingApptDate, { textAlign: isRTL ? 'right' : 'left' }]}>
                        {moment.utc(appointment.startTime).format('MMM D, YYYY')}
                      </Text>
                      <Text style={[styles.pendingApptTime, { textAlign: isRTL ? 'right' : 'left' }]}>
                        {moment(appointment.startTime).format('h:mm A')}
                        {appointment.reason ? ` • ${appointment.reason}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.pendingPayBtn}
                      onPress={() => handlePayAppointment(appointment)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.pendingPayBtnText}>
                        {t.appointments?.payNow || 'Pay Now'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={[styles.actionRow, rowStyle, { marginTop: 10 }]}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => handleCancel(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelBtnText}>
                      {t.appointments?.cancel || 'Cancel'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={[styles.actionRow, rowStyle]}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => handleCancel(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>
                    {t.appointments?.cancel || 'Cancel'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.payBtn}
                  onPress={() => handlePay(item)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.payBtnText}>
                    {t.appointments?.payNow || 'Pay Now'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const showLoading = isLoading && !refreshing;

  const listKeyExtractor = useCallback(
    (item, index) => item._id?.toString() || item.id?.toString() || `item-${index}`,
    []
  );

  return (
    <View style={styles.container}>
      <Header title={t.appointments?.myAppointments || 'My Appointments'} showProfile />
      <View style={styles.body}>

        <SegmentedTabs
          isRTL={isRTL}
          activeKey={activeTab}
          onChange={setActiveTab}
          options={[
            { key: 'upcoming', label: t.appointments?.upcoming || 'Upcoming' },
            { key: 'pending', label: t.appointments?.pending || 'Pending' },
          ]}
        />

        {showLoading ? (
          <View style={styles.listPad}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.skeletonCard}>
                <View style={{ flexDirection: rowStyle.flexDirection, alignItems: 'center' }}>
                  <Skeleton width={52} height={52} style={{ borderRadius: 26 }} />
                  <View style={{ flex: 1, marginHorizontal: SPACING.md }}>
                    <Skeleton width="70%" height={14} style={{ marginBottom: SPACING.sm }} />
                    <Skeleton width="50%" height={12} />
                    <Skeleton width="40%" height={12} style={{ marginTop: SPACING.sm }} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            data={filteredData}
            renderItem={renderCard}
            keyExtractor={listKeyExtractor}
            contentContainerStyle={[styles.listContent, { paddingBottom: tabBarInset }]}
            removeClippedSubviews
            initialNumToRender={8}
            maxToRenderPerBatch={6}
            windowSize={7}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
              />
            }
            ListEmptyComponent={
              hasLoadError ? (
                <EmptyState
                  icon={ICONS.calendar}
                  title={t.appointments?.loadError || 'Could not load appointments'}
                  subtitle={t.appointments?.loadErrorHint || 'Check your connection and try again'}
                  actionLabel={t.common?.retry || 'Retry'}
                  onAction={handleRetryLoad}
                />
              ) : (
                <EmptyState
                  icon={ICONS.calendar}
                  title={
                    activeTab === 'upcoming'
                      ? (t.appointments?.noUpcoming || 'No upcoming appointments')
                      : (t.appointments?.noPending || 'No pending appointments')
                  }
                  subtitle={
                    activeTab === 'upcoming'
                      ? (t.appointments?.noUpcomingHint || 'Book a session with a therapist to get started')
                      : (t.appointments?.noPendingHint || 'Pending appointments awaiting payment will appear here')
                  }
                  actionLabel={activeTab === 'upcoming' ? (t.home?.quickBook || 'Find Therapist') : undefined}
                  onAction={activeTab === 'upcoming'
                    ? () => navigation.navigate('Main', { screen: 'SearchTab' })
                    : undefined}
                />
              )
            }
          />
        )}

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  body: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, flex: 1 },
  listPad: { paddingTop: SPACING.sm },
  listContent: { paddingTop: SPACING.sm, flexGrow: 1 },
  skeletonCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
    ...cardBorder,
  },

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
    ...cardBorder,
  },
  rescheduledPayBanner: {
    backgroundColor: COLORS.actionBg,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.actionBorder,
  },
  rescheduledPayText: {
    color: COLORS.actionText,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  pendingListTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  pendingApptRow: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  pendingApptDate: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  pendingApptTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  pendingPayBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    ...SHADOWS.primary,
  },
  pendingPayBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardHeader: { alignItems: 'center' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
  },
  docName: { fontWeight: '700', fontSize: 15, color: COLORS.textPrimary },
  docType: { color: COLORS.textSecondary, fontSize: 12, marginVertical: 2 },
  dateTime: { color: COLORS.primaryDark, fontSize: 12, fontWeight: '600' },
  timezoneText: { color: COLORS.gray500, fontSize: 10, marginTop: 2, fontStyle: 'italic' },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.pill },

  // Buttons
  actionRow: {
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    flexWrap: 'wrap'
  },

  // Cancel Button - Outline style with danger color
  cancelBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    backgroundColor: COLORS.surface,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: COLORS.danger || '#ef4444',
    fontSize: 13,
    fontWeight: '600'
  },

  // Reschedule Button - Outline style with secondary color
  rescheduleBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
    backgroundColor: COLORS.surface,
    minWidth: 95,
    alignItems: 'center',
  },
  rescheduleBtnText: {
    color: COLORS.secondary || '#65BED6',
    fontSize: 13,
    fontWeight: '600'
  },

  // Add to Calendar Button - Outline style
  calendarBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.primaryMuted,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
  },
  calendarBtnText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '600',
  },

  joinBtn: {
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    ...SHADOWS.primary,
  },
  joinBtnDisabled: {
    backgroundColor: COLORS.gray400,
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0
  },
  joinBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold'
  },

  // "Starts in Xh Ym" badge (before join window)
  startsInBadge: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.primaryMuted,
  },
  startsInText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '600',
  },

  // Note shown in waiting room before appointment starts
  earlyJoinNote: {
    marginTop: 6,
    fontSize: 11,
    color: COLORS.gray600,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Countdown Timer
  countdownContainer: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    alignItems: 'center'
  },
  countdownText: {
    color: '#FF9800',
    fontSize: 12,
    fontWeight: '600'
  },

  // Pay Now Button - Solid primary button
  payBtn: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    minWidth: 100,
    alignItems: 'center',
    ...SHADOWS.primary,
  },
  payBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold'
  },

  // Generic outline button (fallback)
  outlineBtn: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.gray400,
    backgroundColor: 'transparent',
    minWidth: 80,
    alignItems: 'center'
  },

  // Generic solid button (fallback)
  solidBtn: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  }
});

export default AppointmentsScreen;
