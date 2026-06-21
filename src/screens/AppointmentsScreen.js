import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, RefreshControl, ActivityIndicator, Linking, Alert, Platform } from 'react-native';
import { useNavigation, CommonActions, useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../store/LanguageContext';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import Header from '../components/Header';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import moment from 'moment-timezone';
import {
  useGetUpcomingAppointments,
  useGetPendingAppointmentsGroupedByDoctor,
} from '../api/services/Appointment.Service';
import socketService from '../utils/socket';

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
        ⏱ {label || 'Call starts in'} {timeLeft.minutes}m {timeLeft.seconds}s
      </Text>
    </View>
  );
};

const countdownStyles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF8E1',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  text: {
    color: '#F57C00',
    fontSize: 13,
    fontWeight: '600',
  },
});

const AppointmentsScreen = () => {
  const navigation = useNavigation();
  const { t, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [refreshing, setRefreshing] = useState(false);
  const [callEndedRooms, setCallEndedRooms] = useState(new Set());
  const [userId, setUserId] = useState(null);
  const hasRedirected = useRef(false);
  const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };

  // Real API calls - must be called before any conditional returns
  const {
    data: upcomingAppointmentsRaw,
    isLoading: upcomingLoading,
    refetch: refetchUpcoming
  } = useGetUpcomingAppointments();

  const {
    data: pendingAppointments,
    isLoading: pendingLoading,
    refetch: refetchPending
  } = useGetPendingAppointmentsGroupedByDoctor();

  // State for filtered appointments (to avoid re-filtering on every render)
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);

  // Update filtered appointments when raw data changes
  useEffect(() => {
    if (upcomingAppointmentsRaw) {
      const filtered = upcomingAppointmentsRaw.filter(appt => {
        const clientTz = appt.clientTz || moment.tz.guess();
        const endTime = moment.tz(appt.endTime, clientTz);
        const now = moment.tz(clientTz);
        return endTime.isSameOrAfter(now);
      });
      setUpcomingAppointments(filtered);
    }
  }, [upcomingAppointmentsRaw]);

  // Filter expired appointments every 30 seconds
  useEffect(() => {
    const filterTimer = setInterval(() => {
      setUpcomingAppointments(prev => {
        if (!prev || prev.length === 0) return prev;

        const filtered = prev.filter(appt => {
          const clientTz = appt.clientTz || moment.tz.guess();
          const endTime = moment.tz(appt.endTime, clientTz);
          const now = moment.tz(clientTz);
          return endTime.isSameOrAfter(now);
        });

        // Only update if something was filtered out
        if (filtered.length !== prev.length) {
          console.log('🔍 [Appointment Filter] Removed expired appointments');
          return filtered;
        }
        return prev;
      });
    }, 30000); // Check every 30 seconds like frontend

    return () => clearInterval(filterTimer);
  }, []);

  // Get user ID for socket connection
  useEffect(() => {
    const getUserId = async () => {
      try {
        // Try to get from appointments data
        if (upcomingAppointments && upcomingAppointments.length > 0) {
          const firstAppointment = upcomingAppointments[0];
          const id = firstAppointment?.patient?.id || firstAppointment?.patient?._id;
          if (id) {
            setUserId(id);
          }
        }
      } catch (error) {
        console.log('Error getting user ID:', error);
      }
    };
    getUserId();
  }, [upcomingAppointments]);

  // Socket connection for real-time updates
  useEffect(() => {
    if (userId) {
      socketService.connect(userId);

      const handleCallEnded = (data) => {
        console.log('Call ended event received:', data);
        const isProviderEndedCall = data?.message?.includes('provider') || data?.message?.includes('doctor');

        if (isProviderEndedCall && data?.roomId) {
          setCallEndedRooms(prev => new Set([...prev, data.roomId]));
          // Refetch appointments to update UI
          refetchUpcoming();
        }
      };

      // Handle appointment rejection in real-time
      const handleAppointmentRejected = (data) => {
        console.log('📡 Appointment rejected event received:', data);
        // Refetch both upcoming and pending appointments to update UI
        refetchUpcoming();
        refetchPending();
        // Invalidate queries to ensure fresh data
        queryClient.invalidateQueries({ queryKey: ['upcomingAppointments'] });
        queryClient.invalidateQueries({ queryKey: ['pendingAppointmentsGrouped'] });
      };

      // Handle appointment cancellation in real-time
      const handleAppointmentCancelled = (data) => {
        console.log('📡 Appointment cancelled event received:', data);
        refetchUpcoming();
        refetchPending();
        queryClient.invalidateQueries({ queryKey: ['upcomingAppointments'] });
        queryClient.invalidateQueries({ queryKey: ['pendingAppointmentsGrouped'] });
      };

      // Handle appointment status change in real-time
      const handleAppointmentStatusChanged = (data) => {
        console.log('📡 Appointment status changed event received:', data);
        refetchUpcoming();
        refetchPending();
        queryClient.invalidateQueries({ queryKey: ['upcomingAppointments'] });
        queryClient.invalidateQueries({ queryKey: ['pendingAppointmentsGrouped'] });
      };

      if (socketService.socket) {
        socketService.socket.on('callEnded', handleCallEnded);
        socketService.socket.on('appointmentRejected', handleAppointmentRejected);
        socketService.socket.on('appointmentCancelled', handleAppointmentCancelled);
        socketService.socket.on('appointmentStatusChanged', handleAppointmentStatusChanged);
      }

      return () => {
        if (socketService.socket) {
          socketService.socket.off('callEnded', handleCallEnded);
          socketService.socket.off('appointmentRejected', handleAppointmentRejected);
          socketService.socket.off('appointmentCancelled', handleAppointmentCancelled);
          socketService.socket.off('appointmentStatusChanged', handleAppointmentStatusChanged);
        }
      };
    }
  }, [userId, refetchUpcoming, refetchPending, queryClient]);

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchUpcoming(), refetchPending()]);
    } catch (error) {
      console.error('Error refreshing:', error);
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

  // Check authentication - redirect to login if not authenticated - AFTER all hooks
  // Delay to let auth store hydrate before checking (prevents redirect loop after login)
  useEffect(() => {
    if (!isAuthenticated && !hasRedirected.current) {
      const timer = setTimeout(() => {
        // Re-check after delay — store may have hydrated by now
        if (!hasRedirected.current) {
          hasRedirected.current = true;
          navigation.reset({
            index: 1,
            routes: [
              { name: 'Main', state: { routes: [{ name: 'HomeTab' }] } },
              {
                name: 'LoginScreen',
                params: {
                  targetScreen: 'AppointmentsTab',
                  targetParams: {}
                }
              }
            ],
          });
        }
      }, 500);
      return () => clearTimeout(timer);
    }
    if (isAuthenticated) {
      hasRedirected.current = false;
    }
  }, [isAuthenticated, navigation]);

  // Get data based on active tab
  const filteredData = activeTab === 'upcoming'
    ? (upcomingAppointments || [])
    : (pendingAppointments || []);

  const isLoading = activeTab === 'upcoming' ? upcomingLoading : pendingLoading;

  const handlePay = (item) => {
    // For pending appointments grouped by doctor
    // Since UI doesn't support bulk payment, we pay for the first appointment
    const firstAppointment = item.appointments?.[0];

    if (!firstAppointment) {
      Alert.alert(t.appointments?.error || 'Error', 'No appointment found to pay for');
      return;
    }

    // Get appointment ID - the API returns it as 'appointmentId', not '_id'
    const appointmentId = firstAppointment.appointmentId || firstAppointment._id || firstAppointment.id;

    if (!appointmentId) {
      console.error('❌ No valid appointment ID found in:', firstAppointment);
      Alert.alert(t.appointments?.error || 'Error', 'Appointment ID not found');
      return;
    }

    console.log('✅ Navigating to Checkout with appointment ID:', appointmentId);

    // Navigate to checkout with the appointment ID
    navigation.navigate('Checkout', {
      id: appointmentId
    });
  };

  const handleJoinCall = (item) => {
    // Check if appointment has required data
    if (!item?.roomId) {
      return; // Don't show alert, timer is already visible
    }

    navigation.navigate('VideoConsultation', {
      meetingRoomId: item.roomId,
      userID: item.patient?.id || item.patient?._id,
      userName: item.patient?.fullName,
    });
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
        // iOS: Use calshow URL scheme or Google Calendar
        Alert.alert(
          t.appointments?.addToCalendar || 'Add to Calendar',
          t.appointments?.chooseCalendarApp || 'Choose calendar app',
          [
            {
              text: t.appointments?.appleCalendar || 'Apple Calendar',
              onPress: () => {
                // Open Apple Calendar app
                Linking.openURL('calshow:');
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
      console.error('Error adding to calendar:', error);
      Alert.alert(
        t.common?.error || 'Error',
        t.appointments?.calendarError || 'Could not add to calendar'
      );
    }
  };

  const handleCancel = (item) => {
    console.log('🔍 [AppointmentsScreen] handleCancel called with item:', JSON.stringify(item, null, 2));

    // Handle both grouped pending appointments and single upcoming appointments
    let appointment;

    // Check if this is a grouped pending appointment (has appointments array)
    if (item.appointments && Array.isArray(item.appointments) && item.appointments.length > 0) {
      // Pending appointment grouped by doctor - navigate with first appointment
      appointment = item.appointments[0];
      console.log('🔍 [AppointmentsScreen] Extracted from appointments array:', JSON.stringify(appointment, null, 2));
    } else {
      // Single upcoming appointment
      appointment = item;
      console.log('🔍 [AppointmentsScreen] Using item directly as appointment');
    }

    if (!appointment) {
      console.error('❌ No valid appointment found in item:', item);
      Alert.alert(t.appointments?.error || 'Error', 'Appointment not found');
      return;
    }

    console.log('🔍 [AppointmentsScreen] Final appointment._id:', appointment._id);
    console.log('🔍 [AppointmentsScreen] Final appointment.id:', appointment.id);
    console.log('✅ Navigating to CancelAppointment screen');

    // Navigate to CancelAppointment screen with appointment data
    navigation.navigate('CancelAppointment', {
      appointment: appointment
    });
  };

  const handleReschedule = (item) => {
    // Navigate to reschedule screen with appointment data
    navigation.navigate('RescheduleAppointment', {
      appointment: item,
      onRescheduleSuccess: () => {
        queryClient.invalidateQueries(['upcomingAppointments']);
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

    if (isUpcoming && item?.startTime && item?.endTime) {
      // Parse appointment times - they come from backend as local time strings (YYYY-MM-DDTHH:mm:ss)
      // The backend already converts them to the user's timezone
      const clientTz = item.clientTz || moment.tz.guess();

      // Parse times in the client's timezone
      const appointmentStart = moment.tz(item.startTime, clientTz);
      const appointmentEnd = moment.tz(item.endTime, clientTz);
      const joinWindowStart = appointmentStart.clone().subtract(10, 'minutes');

      // Get current time in the same timezone for accurate comparison
      const now = moment.tz(clientTz);

      const isBeforeStart = now.isBefore(appointmentStart);
      const isInJoinWindow = now.isSameOrAfter(joinWindowStart) && now.isSameOrBefore(appointmentStart);

      // Show join button from 10 minutes before start until end time
      const isAfterJoinWindowStart = now.isSameOrAfter(joinWindowStart);
      const isBeforeOrAtEndTime = now.isSameOrBefore(appointmentEnd);
      showJoinButton = isAfterJoinWindowStart && isBeforeOrAtEndTime;

      // Room is only expired AFTER the end time
      isRoomExpired = now.isAfter(appointmentEnd);

      // Show countdown if we're in the 10-minute join window but before start time
      if (isInJoinWindow && isBeforeStart) {
        const diff = appointmentStart.diff(now, 'seconds');
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        timeUntilStart = { minutes, seconds };
        showCountdown = true;
      }

      // Can reschedule if more than 6 hours away and less than 3 attempts
      const sixHoursFromNow = now.clone().add(6, 'hours');
      canReschedule = appointmentStart.isAfter(sixHoursFromNow)
        && (item.reschedulingAttempts || 0) < 3;

      // Can cancel if before start time (even if in join window)
      canCancel = appointmentStart.isAfter(now);
    }

    // Check if call was ended by provider
    const callWasEnded = callEndedRooms.has(item?.roomId);

    // Check if appointment needs verification or is not confirmed
    const needsVerification = isUpcoming && (
      item?.approvedByDoctor === false ||
      item?.paymentStatus !== 'Completed' ||
      item?.status === 'Pending'
    );

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
            backgroundColor: needsVerification ? '#FFF3CD' : (isUpcoming ? COLORS.promo1 : COLORS.promo2)
          }]}>
            <Text style={{
              color: needsVerification ? '#FF9800' : (isUpcoming ? COLORS.primary : COLORS.warning),
              fontSize: 10,
              fontWeight: 'bold'
            }}>
              {isUpcoming
                ? (needsVerification ? (t.appointments?.drApprovalNeeded || 'Dr Approval Needed') : (t.appointments?.confirmed || 'Confirmed'))
                : (t.appointments?.pendingStatus || 'Pending')
              }
            </Text>
          </View>
        </View>

        {/* --- UPCOMING ACTIONS --- */}
        {isUpcoming && showJoinButton && !isRoomExpired && !callWasEnded && !needsVerification && (
          <View style={{ marginTop: 15 }}>
            <TouchableOpacity
              style={styles.joinBtn}
              onPress={() => handleJoinCall(item)}
              activeOpacity={0.8}
            >
              <Text style={styles.joinBtnText}>
                {t.appointments?.joinCall || 'Join Call'}
              </Text>
            </TouchableOpacity>

            {showCountdown && (
              <CountdownTimer
                startTime={item.startTime}
                clientTz={item.clientTz || moment.tz.guess()}
                label={t.appointments?.callStartsIn || 'Call starts in'}
              />
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
    );
  };

  const showLoading = (!isAuthenticated) || (isLoading && !refreshing);

  return (
    <View style={styles.container}>
      <Header title={t.appointments?.myAppointments || 'My Appointments'} showBack={false} />
      <View style={{ padding: 20, flex: 1 }}>

        {/* Tabs */}
        <View style={[styles.tabContainer, rowStyle]}>
          <TouchableOpacity
            onPress={() => setActiveTab('upcoming')}
            style={[styles.tabBtn, activeTab === 'upcoming' && styles.activeTabBtn]}
          >
            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
              {t.appointments?.upcoming || 'Upcoming'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('pending')}
            style={[styles.tabBtn, activeTab === 'pending' && styles.activeTabBtn]}
          >
            <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
              {t.appointments?.pending || 'Pending'}
            </Text>
          </TouchableOpacity>
        </View>

        {showLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredData}
            renderItem={renderCard}
            keyExtractor={(item, index) => item._id?.toString() || item.id?.toString() || `item-${index}`}
            contentContainerStyle={{ paddingTop: 10 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
              />
            }
            ListEmptyComponent={
              <View style={{ alignItems: 'center', marginTop: 50 }}>
                <Text style={{ color: COLORS.gray500 }}>No appointments</Text>
              </View>
            }
          />
        )}

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Tabs
  tabContainer: { backgroundColor: COLORS.gray300, borderRadius: 12, padding: 4, marginBottom: 20, flexDirection: 'row' },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTabBtn: { backgroundColor: COLORS.primary, shadowColor: COLORS.shadow, shadowOpacity: 0.1, elevation: 2 },
  tabText: { fontSize: 14, color: COLORS.gray700, fontWeight: '600' },
  activeTabText: { color: 'white', fontWeight: 'bold' },

  // Card
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 15, marginBottom: 15, shadowColor: COLORS.shadow, shadowOpacity: 0.05, elevation: 2 },
  cardHeader: { alignItems: 'center' },
  avatar: { width: 55, height: 55, borderRadius: 27.5 },
  docName: { fontWeight: 'bold', fontSize: 15, color: COLORS.textPrimary },
  docType: { color: COLORS.textSecondary, fontSize: 12, marginVertical: 2 },
  dateTime: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  timezoneText: { color: COLORS.gray500, fontSize: 10, marginTop: 2, fontStyle: 'italic' },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },

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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.danger || '#ef4444',
    backgroundColor: 'transparent',
    minWidth: 80,
    alignItems: 'center'
  },
  cancelBtnText: {
    color: COLORS.danger || '#ef4444',
    fontSize: 13,
    fontWeight: '600'
  },

  // Reschedule Button - Outline style with secondary color
  rescheduleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.secondary || '#65BED6',
    backgroundColor: 'transparent',
    minWidth: 95,
    alignItems: 'center'
  },
  rescheduleBtnText: {
    color: COLORS.secondary || '#65BED6',
    fontSize: 13,
    fontWeight: '600'
  },

  // Add to Calendar Button - Outline style
  calendarBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
    backgroundColor: 'transparent',
    alignItems: 'center'
  },
  calendarBtnText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '600'
  },

  // Join Call Button - Solid primary button (full width)
  joinBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3
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
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    minWidth: 100,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3
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
