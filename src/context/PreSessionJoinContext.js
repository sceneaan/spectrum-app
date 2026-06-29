import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { canAuthenticatedUserJoinMobileVideo } from '../utils/videoAccess';
import { buildVideoSessionParams } from '../utils/sessionPrep';
import PreSessionPrepSheet from '../components/PreSessionPrepSheet';
import { PRE_SESSION_JOIN_EVENT } from '../utils/pushNotificationHandlers';
import { getUserId } from '../utils/userId';
import haptics from '../utils/haptics';
import i18n from '../config/i18n';

const PreSessionJoinContext = createContext(null);

export const PreSessionJoinProvider = ({ children }) => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [pendingSession, setPendingSession] = useState(null);

  const closePrep = useCallback(() => setPendingSession(null), []);

  const requestJoinSession = useCallback((payload) => {
    if (!payload) return;

    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      navigation.navigate('LoginScreen', {
        targetScreen: 'VideoConsultation',
        targetParams: {
          meetingRoomId: payload.roomId || payload.meetingRoomId,
        },
      });
      return;
    }

    if (!canAuthenticatedUserJoinMobileVideo(user)) {
      Alert.alert(
        i18n.t('auth.videoAccessDeniedTitle'),
        i18n.t('auth.videoAccessDeniedMessage'),
      );
      return;
    }

    const appointment = payload.appointment || payload;
    const params = buildVideoSessionParams({ appointment, user });
    const roomId = params.meetingRoomId || payload.roomId || payload.meetingRoomId;

    if (!roomId || !params.userID) return;

    setPendingSession({
      appointment,
      providerName: payload.providerName
        || appointment?.provider?.fullNameEnglish
        || appointment?.provider?.fullName
        || appointment?.providerName,
      ...params,
      meetingRoomId: roomId,
    });
  }, [user]);

  const completeJoin = useCallback(() => {
    if (!pendingSession?.meetingRoomId) return;
    const loggedInUserId = getUserId(user);
    if (!loggedInUserId) return;

    navigation.navigate('VideoConsultation', {
      meetingRoomId: pendingSession.meetingRoomId,
      userID: String(loggedInUserId),
      userName: pendingSession.userName || user?.fullName || user?.fullNameArabic || 'Patient',
    });
    haptics.success();
    closePrep();
  }, [closePrep, navigation, pendingSession, user]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(PRE_SESSION_JOIN_EVENT, (payload) => {
      requestJoinSession(payload);
    });
    return () => sub.remove();
  }, [requestJoinSession]);

  const value = useMemo(() => ({ requestJoinSession }), [requestJoinSession]);

  return (
    <PreSessionJoinContext.Provider value={value}>
      {children}
      <PreSessionPrepSheet
        visible={Boolean(pendingSession)}
        session={pendingSession}
        onClose={closePrep}
        onJoin={completeJoin}
      />
    </PreSessionJoinContext.Provider>
  );
};

export const usePreSessionJoin = () => {
  const ctx = useContext(PreSessionJoinContext);
  if (!ctx) {
    throw new Error('usePreSessionJoin must be used within PreSessionJoinProvider');
  }
  return ctx;
};

export default PreSessionJoinContext;
