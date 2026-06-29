import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Text,
  PermissionsAndroid,
  Platform,
  Dimensions,
  StatusBar,
  ScrollView,
  AppState,
  TouchableOpacity,
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
  TwilioVideo,
  TwilioVideoLocalView,
  TwilioVideoParticipantView,
} from '@twilio/video-react-native-sdk';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import moment from 'moment-timezone';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Polyfill crypto.getRandomValues for @twilio/conversations (uses uuid which needs it)
import 'react-native-get-random-values';
import { Client as ConversationsClient } from '@twilio/conversations';
import socketService from '../../utils/socket';
import logger from '../../utils/logger';
import { pauseSessionTimeout, resumeSessionTimeout } from '../../utils/sessionPause';
import COLORS from '../../constants/colors';
import { useCheckRoomId, useSendInvitation } from '../../api/services/Appointment.Service';
import { getVideoToken, getGuestVideoToken } from '../../api/services/Video.Service';
import { useAuthStore } from '../../store/authStore';
import { canAuthenticatedUserJoinMobileVideo } from '../../utils/videoAccess';

import {
  TopBar,
  ControlBar,
  ChatPanel,
  SettingsModal,
  InvitationModal,
} from './components';

const PRIMARY_COLOR = COLORS.primary;
const SESSION_EXIT_GRACE_MINS = 15;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CustomVideoConferenceScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t, i18n } = useTranslation();
  const { user: authUser } = useAuthStore();
  const { meetingRoomId, userID, userName, isGuest = false, guestToken } = route?.params || {};

  const [sessionUserId, setSessionUserId] = useState(userID ? String(userID) : null);
  const sessionUserIdRef = useRef(sessionUserId);
  useEffect(() => {
    sessionUserIdRef.current = sessionUserId;
  }, [sessionUserId]);

  const activeUserId = sessionUserId || (userID ? String(userID) : null);

  // Refs
  const twilioRef = useRef(null);
  const timerRef = useRef(null);
  const durationRef = useRef(null);
  const roomRef = useRef(null); // Ref to access room data in event handlers
  const heartbeatRef = useRef(null); // Heartbeat interval for presence detection
  const appStateRef = useRef(AppState.currentState); // Track app state for background handling
  const pendingDisconnectTimerRef = useRef(null); // Grace period timer for provider disconnect alert
  const handleEndCallRef = useRef(null); // Stable ref to handleEndCall (avoids circular dep in socket effects)

  // Room state
  const [room, setRoom] = useState({});
  const [isJoined, setIsJoined] = useState(false);
  const [isRoomExpired, setIsRoomExpired] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [wasDropped, setWasDropped] = useState(false);

  // Call state
  const [callDuration, setCallDuration] = useState('00:00:00');
  const [callStartTime, setCallStartTime] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [connectionQuality, setConnectionQuality] = useState('Connecting...');

  // Media state
  const [isMuted, setIsMuted] = useState(false); // Mic starts on — user can mute
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);

  // UI state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [layout, setLayout] = useState('speaker'); // 'speaker' or 'gallery'

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInvitationOpen, setIsInvitationOpen] = useState(false);

  // Participants & streams
  const [participants, setParticipants] = useState([]);
  const [videoTracks, setVideoTracks] = useState(new Map()); // Map of participantSid -> { participantSid, videoTrackSid, participantIdentity }
  const [selectedSpeakerId, setSelectedSpeakerId] = useState(null); // User-selected main speaker

  // Chat
  const [chatMessages, setChatMessages] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const conversationRef = useRef(null);
  const chatClientRef = useRef(null);
  const tokenRef = useRef(null);
  const roomSidRef = useRef(null);

  // Devices
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');

  // API hooks
  const {
    data: roomIdCheck,
    isLoading: roomIdCheckLoader,
    error: roomIdCheckError,
  } = useCheckRoomId(meetingRoomId);

  const { mutate: sendInvitation, isPending: isSendingInvitation } = useSendInvitation();

  const userRole = isGuest ? 'guest' : 'patient';
  const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Display name map — populated from token response and appointment data
  const displayNamesRef = useRef({});

  // Resolve participant identity to display name
  const resolveDisplayName = useCallback((identity) => {
    const id = String(identity);
    // Check our name map first
    if (displayNamesRef.current[id]) return displayNamesRef.current[id];
    // Check if it's the local user
    if (id === String(activeUserId)) return userName;
    // Check room data (backend returns .id not ._id after populate)
    const currentRoom = roomRef.current;
    const providerId = String(currentRoom?.provider?.id || currentRoom?.provider?._id || currentRoom?.provider || '');
    const patientId = String(currentRoom?.patient?.id || currentRoom?.patient?._id || currentRoom?.patient || '');
    if (currentRoom?.provider?.fullName && id === providerId) return currentRoom.provider.fullName;
    if (currentRoom?.patient?.fullName && id === patientId) return currentRoom.patient.fullName;
    // Guest fallback
    if (id.startsWith('guest_')) return 'Guest';
    return 'Participant';
  }, [activeUserId, userName]);

  // Check permissions
  const checkPermissions = async () => {
    if (Platform.OS === 'android') {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.CAMERA,
      ]);

      const allGranted = Object.values(results).every(
        (result) => result === PermissionsAndroid.RESULTS.GRANTED
      );

      if (!allGranted) {
        Alert.alert(
          t('videoConsultation.error', 'Error'),
          t('videoConsultation.permissionsRequired', 'Camera and microphone permissions are required')
        );
        navigation.goBack();
        return false;
      }
    } else if (Platform.OS === 'ios') {
      const cameraResult = await request(PERMISSIONS.IOS.CAMERA);
      const micResult = await request(PERMISSIONS.IOS.MICROPHONE);

      if (cameraResult !== RESULTS.GRANTED || micResult !== RESULTS.GRANTED) {
        Alert.alert(
          t('videoConsultation.error', 'Error'),
          t('videoConsultation.permissionsRequired', 'Camera and microphone permissions are required')
        );
        navigation.goBack();
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    if (isGuest) {
      Alert.alert(
        t('auth.otp.accessDenied', 'Access Denied'),
        t('auth.loginRequiredForSession', 'Please log in to join this session.'),
        [{
          text: t('videoConsultation.goBack', 'Go Back'),
          onPress: () => navigation.replace('LoginScreen', {
            targetScreen: 'GuestVideoInvite',
            targetParams: { roomId: meetingRoomId },
          }),
        }],
      );
      return;
    }
    if (!canAuthenticatedUserJoinMobileVideo(authUser)) {
      Alert.alert(
        t('videoConsultation.error', 'Error'),
        t('videoConsultation.providersUseWeb',
          'Providers must join video sessions from the Spectrum website at the clinic, not the mobile app.'),
        [{ text: t('videoConsultation.goBack', 'Go Back'), onPress: () => navigation.goBack() }],
      );
    }
  }, [isGuest, authUser, navigation, t]);

  useEffect(() => {
    checkPermissions();
  }, []);

  // Don't auto-logout during an active video session
  useEffect(() => {
    pauseSessionTimeout();
    return () => resumeSessionTimeout();
  }, []);

  // Validate room
  useEffect(() => {
    if (roomIdCheck) {
      const roomData = roomIdCheck?.room;
      setRoom(roomData);
      roomRef.current = roomData; // Keep ref in sync for event handlers

      // Pre-populate display names from room data
      logger.debug('[Video] Room provider:', JSON.stringify(roomData?.provider));
      logger.debug('[Video] Room patient:', JSON.stringify(roomData?.patient));

      // Handle both populated objects and plain IDs
      // Backend may return .id or ._id depending on populate
      const providerId = roomData?.provider?.id || roomData?.provider?._id || roomData?.provider;
      const patientId = roomData?.patient?.id || roomData?.patient?._id || roomData?.patient;
      const providerName = roomData?.provider?.fullName || roomData?.provider?.fullNameEnglish;
      const patientName = roomData?.patient?.fullName || roomData?.patient?.fullNameEnglish;

      if (providerId && typeof providerId === 'string' && providerName) {
        displayNamesRef.current[providerId] = providerName;
      }
      if (patientId && typeof patientId === 'string' && patientName) {
        displayNamesRef.current[patientId] = patientName;
      }
      logger.debug('[Video] Display names populated:', JSON.stringify(displayNamesRef.current));

      const currentTime = new Date();
      const endTime = new Date(roomIdCheck?.room?.endTime);
      const hardEndTime = new Date(endTime.getTime() + SESSION_EXIT_GRACE_MINS * 60 * 1000);

      if (hardEndTime < currentTime) {
        setIsRoomExpired(true);
        Alert.alert(
          t('videoConsultation.roomExpired', 'Room Expired'),
          t('videoConsultation.consultationEnded', 'This consultation has ended.'),
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    }
  }, [roomIdCheck]);

  // Socket listeners — attach when connected
  useEffect(() => {
    if (!meetingRoomId || !userName) return;
    if (!isGuest && !activeUserId) return;

    const handleSessionExtended = (data) => {
      if (data?.newEndTime || data?.endTime) {
        const newEndTime = data.newEndTime || data.endTime;
        setRoom((prevRoom) => {
          const updatedRoom = { ...prevRoom, endTime: newEndTime };
          roomRef.current = updatedRoom;
          return updatedRoom;
        });
        setIsRoomExpired(false);
      }
    };

    const handleUserLeft = (data) => {
      if (String(data?.roomId) !== String(meetingRoomId)) return;
      if (String(data?.userId) === String(activeUserId)) return;

      const currentRoom = roomRef.current;
      const providerId = String(currentRoom?.provider?.id || currentRoom?.provider?._id || currentRoom?.provider || '');
      if (!providerId || String(data?.userId) !== providerId) return;

      if (pendingDisconnectTimerRef.current) clearTimeout(pendingDisconnectTimerRef.current);
      pendingDisconnectTimerRef.current = setTimeout(() => {
        pendingDisconnectTimerRef.current = null;
        Alert.alert(
          t('videoConsultation.providerDisconnected', 'Provider Disconnected'),
          t('videoConsultation.providerDisconnectedMessage', 'The provider has left the call. They may rejoin shortly.'),
          [
            { text: t('videoConsultation.waitForProvider', 'Wait'), style: 'default' },
            { text: t('videoConsultation.endCall', 'End Call'), style: 'destructive', onPress: () => handleEndCallRef.current?.() },
          ]
        );
      }, 8000);
    };

    const handleUserJoined = (data) => {
      if (String(data?.roomId) !== String(meetingRoomId)) return;
      if (pendingDisconnectTimerRef.current) {
        clearTimeout(pendingDisconnectTimerRef.current);
        pendingDisconnectTimerRef.current = null;
      }
    };

    const handleSessionEnded = (data) => {
      if (String(data?.roomId) !== String(meetingRoomId)) return;
      Alert.alert(
        t('videoConsultation.sessionEnded', 'Session Ended'),
        t('videoConsultation.sessionEndedByProvider', 'The provider has ended the session.'),
        [{ text: 'OK', onPress: () => handleEndCallRef.current?.() }]
      );
    };

    let listenersAttached = false;

    const attachListeners = () => {
      if (listenersAttached) return;
      listenersAttached = true;
      socketService.joinRoom(meetingRoomId, isGuest ? userName : null);
      socketService.on('sessionExtended', handleSessionExtended);
      socketService.on('userLeft', handleUserLeft);
      socketService.on('userJoined', handleUserJoined);
      socketService.on('meetingEnded', handleSessionEnded);
      socketService.on('callEnded', handleSessionEnded);
    };

    const detachListeners = () => {
      if (!listenersAttached) return;
      listenersAttached = false;
      socketService.off('sessionExtended', handleSessionExtended);
      socketService.off('userLeft', handleUserLeft);
      socketService.off('userJoined', handleUserJoined);
      socketService.off('meetingEnded', handleSessionEnded);
      socketService.off('callEnded', handleSessionEnded);
    };

    const connectSocket = isGuest && guestToken
      ? socketService.connectAsGuest(guestToken, userName)
      : activeUserId
        ? socketService.connect(activeUserId)
        : Promise.resolve();

    connectSocket.then(attachListeners).catch(() => {});
    const connectSub = DeviceEventEmitter.addListener('socket:connected', attachListeners);

    return () => {
      connectSub.remove();
      detachListeners();
    };
  }, [activeUserId, meetingRoomId, userName, isGuest, guestToken, t]);

  // Connect to Twilio room once API response is ready
  const isConnectingRef = useRef(false);

  const connectToTwilio = useCallback(async () => {
    if (isGuest) return;
    if (!roomIdCheck?.room || !userName || !meetingRoomId) return;
    if (!isGuest && !userID) return;
    if (isConnectingRef.current || isJoined) return;
    isConnectingRef.current = true;
    setWasDropped(false);

    try {
      setIsConnecting(true);

      const tokenData = isGuest
        ? await getGuestVideoToken(meetingRoomId, userName, guestToken || null)
        : await getVideoToken(meetingRoomId);

      if (tokenData.identity) {
        const identity = String(tokenData.identity);
        setSessionUserId(identity);
        sessionUserIdRef.current = identity;
      }

      logger.debug('[Video] Connecting to Twilio room:', tokenData.roomName);
      tokenRef.current = tokenData.token;

      if (tokenData.identity && tokenData.displayName) {
        displayNamesRef.current[String(tokenData.identity)] = tokenData.displayName;
      }

      twilioRef.current.connect({
        accessToken: tokenData.token,
        roomName: tokenData.roomName,
        enableAudio: true,
        enableVideo: false,
        enableNetworkQualityReporting: true,
        dominantSpeakerEnabled: true,
      });
    } catch (error) {
      logger.error('[Video] Twilio connect failed:', error);
      setIsConnecting(false);
      isConnectingRef.current = false;
      Alert.alert(
        t('videoConsultation.error', 'Error'),
        t('videoConsultation.connectionError', 'Connection error occurred') + (error?.message ? `: ${error.message}` : ''),
      );
    }
  }, [roomIdCheck, userID, userName, meetingRoomId, isJoined, isGuest, guestToken]);

  useEffect(() => {
    connectToTwilio();
  }, [connectToTwilio]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      // Always send leave signal on unmount, even if cleanup fails
      try {
        socketService.sendMessage('leaveRoom', {
          roomId: meetingRoomId,
          userId: activeUserId,
          timestamp: Date.now(),
        });
      } catch (e) {
        logger.warn('[Video] Error sending leave on unmount:', e);
      }

      twilioRef.current?.disconnect();
      chatClientRef.current?.shutdown?.();
      if (timerRef.current) clearInterval(timerRef.current);
      if (durationRef.current) clearInterval(durationRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (pendingDisconnectTimerRef.current) clearTimeout(pendingDisconnectTimerRef.current);
    };
  }, [meetingRoomId, activeUserId]);

  // Heartbeat for presence detection - sends signal every 10 seconds
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) return;
    heartbeatRef.current = setInterval(() => {
      if (socketService.isConnected()) {
        socketService.sendMessage('heartbeat', {
          roomId: meetingRoomId,
          userId: activeUserId,
          timestamp: Date.now(),
        });
      }
    }, 10000); // Every 10 seconds
  }, [meetingRoomId, activeUserId]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  // Send leave room signal - ensures it's always sent
  const sendLeaveSignal = useCallback(() => {
    try {
      // Always try to send leave signal, even if socket seems disconnected
      // Socket.IO will queue the message if reconnecting
      socketService.sendMessage('leaveRoom', {
        roomId: meetingRoomId,
        userId: activeUserId,
        timestamp: Date.now(),
      });
      socketService.leaveRoom(meetingRoomId);
    } catch (error) {
      logger.warn('[Video] Error sending leave signal:', error);
    }
  }, [meetingRoomId, activeUserId]);

  // Handle app going to background — pause heartbeat only (do not mark as left)
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (
        appStateRef.current.match(/active/) &&
        nextAppState === 'background'
      ) {
        logger.debug('[Video] App going to background, pausing heartbeat');
        stopHeartbeat();
      } else if (
        appStateRef.current.match(/background/) &&
        nextAppState === 'active'
      ) {
        logger.debug('[Video] App returning to foreground');
        if (isJoined) {
          startHeartbeat();
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [isJoined, stopHeartbeat, startHeartbeat]);

  // Start heartbeat when joined
  useEffect(() => {
    if (isJoined) {
      startHeartbeat();
    }
    return () => {
      stopHeartbeat();
    };
  }, [isJoined, startHeartbeat, stopHeartbeat]);

  // Initialize Twilio Conversations for chat when joined
  useEffect(() => {
    logger.debug('[Video] Chat effect triggered — isJoined:', isJoined, 'hasToken:', !!tokenRef.current);
    if (!isJoined || !tokenRef.current) return;
    let cancelled = false;

    const initChat = async () => {
      try {
        logger.debug('[Video] Initializing Twilio Conversations client...');
        const client = new ConversationsClient(tokenRef.current);
        chatClientRef.current = client;

        client.on('stateChanged', async (state) => {
          logger.debug('[Video] Conversations client state:', state);
          if (cancelled || state !== 'initialized') return;

          const sid = roomSidRef.current;
          logger.debug('[Video] Looking for conversation with SID:', sid);
          if (!sid) {
            logger.warn('[Video] No room SID available for chat');
            return;
          }

          // Find the conversation by room SID (same key the backend uses)
          // Retry a few times since conversation may not exist yet
          let conversation = null;
          for (let i = 0; i < 5; i++) {
            try {
              conversation = await client.getConversationByUniqueName(sid);
              break;
            } catch (e) {
              logger.debug(`[Video] Chat conversation not found, retrying (${i + 1}/5)...`);
              await new Promise(r => setTimeout(r, 2000));
            }
          }

          if (!conversation || cancelled) return;
          conversationRef.current = conversation;

          try { await conversation.join(); } catch {} // ignore if already joined

          // Load existing messages
          const existingMessages = await conversation.getMessages();
          if (!cancelled) {
            const formatted = existingMessages.items.map(m => ({
              id: m.sid,
              sender: resolveDisplayName(m.author),
              senderId: m.author,
              text: m.body,
              time: m.dateCreated?.toLocaleTimeString('en-us', { hour: 'numeric', minute: 'numeric' }),
              role: m.author === String(activeUserId) ? userRole : 'provider',
            }));
            setChatMessages(formatted);
          }

          // Listen for new messages
          conversation.on('messageAdded', (m) => {
            if (cancelled) return;
            const newMsg = {
              id: m.sid,
              sender: resolveDisplayName(m.author),
              senderId: m.author,
              text: m.body,
              time: m.dateCreated?.toLocaleTimeString('en-us', { hour: 'numeric', minute: 'numeric' }),
              role: m.author === String(activeUserId) ? userRole : 'provider',
            };
            setChatMessages(prev => [...prev, newMsg]);
            if (!isChatOpen) setUnreadMessages(prev => prev + 1);
          });

          logger.debug('[Video] Chat connected to Twilio Conversations');
        });
      } catch (err) {
        logger.warn('[Video] Chat initialization failed (non-fatal):', err?.message);
      }
    };

    initChat();
    return () => {
      cancelled = true;
      chatClientRef.current?.shutdown?.();
    };
  }, [isJoined, activeUserId, userRole, resolveDisplayName]);

  // ========== Twilio Event Handlers ==========

  const _onRoomDidConnect = ({ roomName, roomSid, participants: roomParticipants }) => {
    logger.debug('[Video] ✅ Successfully joined room:', roomName, 'SID:', roomSid, 'existing participants:', roomParticipants?.length);
    roomSidRef.current = roomSid;
    isConnectingRef.current = false;
    setWasDropped(false);
    setIsJoined(true);
    setIsConnecting(false);
    setConnectionQuality('Connected');
    setCallStartTime(moment());

    // Route audio to speaker so remote audio plays through loudspeaker
    twilioRef.current.toggleSoundSetup(true);

    // Notify backend of room join
    if (socketService.isConnected()) {
      socketService.sendMessage('joinRoom', {
        roomId: meetingRoomId,
        userId: activeUserId,
      });
    }

    // Build initial participant list: local user + anyone already in the room.
    // Including existing participants here prevents _onRoomParticipantDidConnect
    // from adding them again, which would cause duplicate entries and wrong counts.
    const currentRoom = roomRef.current;
    const existingRemote = (roomParticipants || []).map((p) => {
      const remoteID = String(p.identity);
      const providerId = String(currentRoom?.provider?.id || currentRoom?.provider?._id || currentRoom?.provider || '');
      const patientId = String(currentRoom?.patient?.id || currentRoom?.patient?._id || currentRoom?.patient || '');
      let role = 'guest';
      if (providerId && remoteID === providerId) role = 'provider';
      else if (patientId && remoteID === patientId) role = 'patient';
      return {
        id: remoteID,
        name: resolveDisplayName(remoteID),
        role,
        isMuted: false,
        isVideoOn: false,
        participantSid: p.sid,
      };
    });

    setParticipants([
      {
        id: String(activeUserId),
        name: userName,
        role: userRole,
        isMuted: false,
        isVideoOn: false,
      },
      ...existingRemote,
    ]);
  };

  const _onRoomDidFailToConnect = (error) => {
    logger.error('[Video] Room connect failed:', error);
    setIsConnecting(false);
    isConnectingRef.current = false;
    setConnectionQuality('Failed');
    Alert.alert(
      t('videoConsultation.error', 'Error'),
      t('videoConsultation.connectionError', 'Failed to join room. Please try again.'),
    );
  };

  const isDisconnectingRef = useRef(false);

  const _onRoomDidDisconnect = ({ error }) => {
    logger.debug('[Video] Disconnected from room', error);
    if (isDisconnectingRef.current) return;

    stopHeartbeat();
    isConnectingRef.current = false;

    if (error) {
      setWasDropped(true);
      setIsJoined(false);
      setIsConnecting(false);
      setConnectionQuality('Disconnected');
      return;
    }

    isDisconnectingRef.current = true;
    handleEndCall();
  };

  const _onRoomParticipantDidConnect = (participant) => {
    const currentRoom = roomRef.current;
    const patientId = String(currentRoom?.patient?.id || currentRoom?.patient?._id || currentRoom?.patient || '');
    const providerId = String(currentRoom?.provider?.id || currentRoom?.provider?._id || currentRoom?.provider || '');

    const remoteUserID = String(participant.identity);
    const resolvedName = resolveDisplayName(remoteUserID);
    logger.debug('[Video] Participant connected — identity:', remoteUserID, 'resolved name:', resolvedName, 'providerId:', providerId, 'patientId:', patientId);
    let role = 'guest';

    if (providerId && remoteUserID === providerId) {
      role = 'provider';
    } else if (patientId && remoteUserID === patientId) {
      role = 'patient';
    }

    // Provider rejoined — cancel any pending disconnect alert
    if (pendingDisconnectTimerRef.current) {
      clearTimeout(pendingDisconnectTimerRef.current);
      pendingDisconnectTimerRef.current = null;
    }

    setParticipants((prev) => {
      if (prev.find((p) => p.id === remoteUserID)) return prev;
      return [...prev, {
        id: remoteUserID,
        name: resolvedName,
        role,
        isMuted: false,
        isVideoOn: false,
        participantSid: participant.sid,
      }];
    });
  };

  const _onRoomParticipantDidDisconnect = (participant) => {
    const deletedUserID = String(participant.identity);

    // Determine role from room data to decide if this is the provider
    const currentRoom = roomRef.current;
    const providerId = String(currentRoom?.provider?.id || currentRoom?.provider?._id || currentRoom?.provider || '');
    const isProvider = providerId && deletedUserID === providerId;

    if (isProvider) {
      // Start 8-second grace period — provider may quickly reconnect
      if (pendingDisconnectTimerRef.current) clearTimeout(pendingDisconnectTimerRef.current);
      pendingDisconnectTimerRef.current = setTimeout(() => {
        pendingDisconnectTimerRef.current = null;
        Alert.alert(
          t('videoConsultation.providerDisconnected', 'Provider Disconnected'),
          t('videoConsultation.providerDisconnectedMessage', 'The provider has left the call. They may rejoin shortly.'),
          [
            { text: t('videoConsultation.waitForProvider', 'Wait'), style: 'default' },
            { text: t('videoConsultation.endCall', 'End Call'), style: 'destructive', onPress: () => handleEndCallRef.current?.() },
          ]
        );
      }, 8000);
    }

    setParticipants((prev) => prev.filter((p) => p.id !== deletedUserID));

    // If the disconnected participant was the selected main speaker, reset to auto
    setSelectedSpeakerId((prev) => prev === deletedUserID ? null : prev);

    // Remove video tracks for this participant
    setVideoTracks((prevTracks) => {
      const newTracks = new Map(prevTracks);
      newTracks.delete(participant.sid);
      return newTracks;
    });
  };

  const _onParticipantAddedVideoTrack = ({ participant, track }) => {
    const remoteUserID = String(participant.identity);

    setVideoTracks((prevTracks) => {
      const newTracks = new Map(prevTracks);
      newTracks.set(participant.sid, {
        participantSid: participant.sid,
        videoTrackSid: track.trackSid,
        participantIdentity: participant.identity,
      });
      return newTracks;
    });

    // Update participant video state
    setParticipants((prev) => {
      const existingParticipant = prev.find((p) => p.id === remoteUserID);
      if (existingParticipant) {
        return prev.map((p) =>
          p.id === remoteUserID ? { ...p, isVideoOn: true, participantSid: participant.sid } : p
        );
      }
      // Add new participant from track (provider was already in room)
      const currentRoom = roomRef.current;
      const providerId = String(currentRoom?.provider?.id || currentRoom?.provider?._id || currentRoom?.provider || '');
      const patientId = String(currentRoom?.patient?.id || currentRoom?.patient?._id || currentRoom?.patient || '');
      let role = 'guest';
      if (providerId && remoteUserID === providerId) {
        role = 'provider';
      } else if (patientId && remoteUserID === patientId) {
        role = 'patient';
      }
      return [...prev, {
        id: remoteUserID,
        name: resolveDisplayName(remoteUserID),
        role,
        isMuted: false,
        isVideoOn: true,
        participantSid: participant.sid,
      }];
    });
  };

  const _onParticipantRemovedVideoTrack = ({ participant, track }) => {
    const remoteUserID = String(participant.identity);

    setVideoTracks((prevTracks) => {
      const newTracks = new Map(prevTracks);
      newTracks.delete(participant.sid);
      return newTracks;
    });

    setParticipants((prev) =>
      prev.map((p) =>
        p.id === remoteUserID ? { ...p, isVideoOn: false } : p
      )
    );
  };

  const _onParticipantEnabledVideoTrack = ({ participant, track }) => {
    const remoteUserID = String(participant.identity);
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === remoteUserID ? { ...p, isVideoOn: true } : p
      )
    );
  };

  const _onParticipantDisabledVideoTrack = ({ participant, track }) => {
    const remoteUserID = String(participant.identity);
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === remoteUserID ? { ...p, isVideoOn: false } : p
      )
    );
  };

  const _onParticipantEnabledAudioTrack = ({ participant, track }) => {
    const remoteUserID = String(participant.identity);
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === remoteUserID ? { ...p, isMuted: false } : p
      )
    );
  };

  const _onParticipantDisabledAudioTrack = ({ participant, track }) => {
    const remoteUserID = String(participant.identity);
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === remoteUserID ? { ...p, isMuted: true } : p
      )
    );
  };

  // Auto-select the dominant speaker (whoever is actively talking)
  const handleDominantSpeakerDidChange = useCallback(({ participant }) => {
    if (participant?.identity) {
      setSelectedSpeakerId(String(participant.identity));
    }
  }, []);

  // Duration timer
  useEffect(() => {
    if (callStartTime) {
      durationRef.current = setInterval(() => {
        const duration = moment.duration(moment().diff(callStartTime));
        const hours = String(Math.floor(duration.asHours())).padStart(2, '0');
        const minutes = String(duration.minutes()).padStart(2, '0');
        const seconds = String(duration.seconds()).padStart(2, '0');
        setCallDuration(`${hours}:${minutes}:${seconds}`);
      }, 1000);
    }

    return () => {
      if (durationRef.current) clearInterval(durationRef.current);
    };
  }, [callStartTime]);

  // Time remaining timer
  useEffect(() => {
    if (!room?.endTime || isRoomExpired) return;

    const calculateTimeRemaining = () => {
      const now = new Date();
      const endTime = new Date(room.endTime);
      const hardEndTime = new Date(endTime.getTime() + SESSION_EXIT_GRACE_MINS * 60 * 1000);
      const timeDiff = hardEndTime - now;

      if (timeDiff <= 0) {
        setIsRoomExpired(true);
        Alert.alert(
          t('videoConsultation.sessionEnded', 'Session Ended'),
          t('videoConsultation.sessionTimeExpired', 'The scheduled session time has ended.'),
          [{ text: 'OK', onPress: () => handleEndCall() }]
        );
        return;
      }

      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

      setTimeRemaining(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    calculateTimeRemaining();
    timerRef.current = setInterval(calculateTimeRemaining, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [room?.endTime, isRoomExpired]);

  // Control handlers
  const handleToggleMute = useCallback(async () => {
    const newMutedState = !isMuted;
    twilioRef.current.setLocalAudioEnabled(!newMutedState);
    setIsMuted(newMutedState);

    setParticipants((prev) =>
      prev.map((p) => (p.id === String(activeUserId) ? { ...p, isMuted: newMutedState } : p))
    );
  }, [isMuted, activeUserId]);

  const handleToggleVideo = useCallback(async () => {
    const newVideoState = !isVideoOn;
    try {
      await twilioRef.current.setLocalVideoEnabled(newVideoState);
    } catch (e) {
      logger.warn('[Video] setLocalVideoEnabled error (non-fatal):', e);
    }
    setIsVideoOn(newVideoState);

    setParticipants((prev) =>
      prev.map((p) => (p.id === String(activeUserId) ? { ...p, isVideoOn: newVideoState } : p))
    );
  }, [isVideoOn, activeUserId]);

  const handleSwitchCamera = useCallback(async () => {
    twilioRef.current.flipCamera();
    setIsFrontCamera((prev) => !prev);
  }, []);

  const handleToggleChat = useCallback(() => {
    setIsChatOpen((prev) => {
      if (!prev) setUnreadMessages(0);
      return !prev;
    });
  }, []);

  const handleSendMessage = useCallback(async (messageText) => {
    if (!messageText.trim()) return;

    if (conversationRef.current) {
      // Send via Twilio Conversations (message will appear via messageAdded listener)
      try {
        await conversationRef.current.sendMessage(messageText.trim());
      } catch (err) {
        logger.warn('[Video] Failed to send chat message:', err?.message);
        // Fallback: add locally
        setChatMessages((prev) => [...prev, {
          id: Date.now(),
          sender: userName,
          senderId: String(activeUserId),
          text: messageText,
          time: moment().format('h:mm a'),
          role: userRole,
        }]);
      }
    } else {
      // Fallback: local-only message
      setChatMessages((prev) => [...prev, {
        id: Date.now(),
        sender: userName,
        senderId: String(activeUserId),
        text: messageText,
        time: moment().format('h:mm a'),
        role: userRole,
      }]);
    }
  }, [userName, activeUserId, userRole]);

  const handleLayoutChange = useCallback((newLayout) => {
    setLayout(newLayout);
  }, []);

  const handleOpenSettings = useCallback(() => {
    setAudioDevices([
      { deviceId: 'default', label: 'Default Microphone' },
      { deviceId: 'speaker', label: 'Speakerphone' },
    ]);
    setVideoDevices([
      { deviceId: 'front', label: 'Front Camera' },
      { deviceId: 'back', label: 'Back Camera' },
    ]);
    setIsSettingsOpen(true);
  }, []);

  const handleApplySettings = useCallback(async () => {
    if (selectedVideoDevice === 'front' && !isFrontCamera) {
      twilioRef.current.flipCamera();
      setIsFrontCamera(true);
    } else if (selectedVideoDevice === 'back' && isFrontCamera) {
      twilioRef.current.flipCamera();
      setIsFrontCamera(false);
    }
    setIsSettingsOpen(false);
  }, [selectedVideoDevice, isFrontCamera]);

  const handleSendInvitation = useCallback(({ phone, message }) => {
    sendInvitation(
      {
        roomId: meetingRoomId,
        phoneNumber: phone,
        providerName: room?.provider?.fullName || room?.provider?.fullNameEnglish || userName,
        message,
        timezone: currentTimezone,
        invitedBy: activeUserId, // Add user ID as fallback for backend auth
        isDoctor: userRole === 'provider',
      },
      {
        onSuccess: () => {
          Alert.alert(t('common.success', 'Success'), t('videoConsultation.invitationSent', 'Invitation sent successfully'));
          setIsInvitationOpen(false);
        },
        onError: (error) => {
          Alert.alert(t('common.error', 'Error'), error?.message || 'Failed to send invitation');
        },
      }
    );
  }, [meetingRoomId, room, userName, currentTimezone, sendInvitation, activeUserId, userRole]);

  const handleEndCall = useCallback(async () => {
    isDisconnectingRef.current = true;
    if (pendingDisconnectTimerRef.current) {
      clearTimeout(pendingDisconnectTimerRef.current);
      pendingDisconnectTimerRef.current = null;
    }
    stopHeartbeat();
    sendLeaveSignal();
    twilioRef.current?.disconnect();
    if (isGuest) {
      socketService.disconnect();
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } else {
      navigation.goBack();
    }
  }, [navigation, stopHeartbeat, sendLeaveSignal, isGuest]);

  // Keep ref up-to-date every render so socket/timer callbacks always have the latest version
  handleEndCallRef.current = handleEndCall;

  // Helper to get initials
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper to get video track for a participant
  const getVideoTrackForParticipant = (participant) => {
    if (!participant?.participantSid) return null;
    return videoTracks.get(participant.participantSid) || null;
  };

  // Determine overlay state
  const showLoading = roomIdCheckLoader || isConnecting;
  const showError = !showLoading && !wasDropped && (
    roomIdCheckError || !meetingRoomId || !userName || (!isGuest && !userID)
  );

  // Error state — no TwilioVideo needed
  if (showError) {
    return (
      <SafeAreaView style={styles.errorContainer} edges={['all']}>
        <Text style={styles.errorText}>
          {roomIdCheckError
            ? t('videoConsultation.invalidRoom', 'Invalid room or room not found')
            : t('videoConsultation.missingParameters', 'Missing required parameters')}
        </Text>
      </SafeAreaView>
    );
  }

  if (wasDropped && !showLoading) {
    return (
      <SafeAreaView style={styles.errorContainer} edges={['all']}>
        <Icon name="wifi-off" size={48} color={COLORS.gray500} style={{ marginBottom: 16 }} />
        <Text style={styles.errorText}>
          {t('videoConsultation.connectionLost', 'Connection lost')}
        </Text>
        <Text style={[styles.errorText, { fontSize: 14, marginTop: 8, fontWeight: 'normal' }]}>
          {t('videoConsultation.connectionLostMessage', 'Your video connection was interrupted. You can try to rejoin.')}
        </Text>
        <TouchableOpacity
          style={styles.rejoinButton}
          onPress={() => {
            isConnectingRef.current = false;
            setIsJoined(false);
            twilioRef.current?.disconnect();
            connectToTwilio();
          }}
        >
          <Text style={styles.rejoinButtonText}>
            {t('videoConsultation.rejoin', 'Rejoin Call')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.leaveButton} onPress={handleEndCall}>
          <Text style={styles.leaveButtonText}>
            {t('videoConsultation.endCall', 'End Call')}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Get participants
  const localParticipant = participants.find((p) => p.id === String(activeUserId));
  const remoteParticipants = participants.filter((p) => p.id !== String(activeUserId));
  const totalParticipants = participants.length;

  // Calculate grid layout based on number of participants and view mode
  const getGridLayout = () => {
    const totalCount = participants.length;
    if (totalCount <= 2) {
      // 1-on-1 call: use 2 columns for gallery, speaker for speaker view
      return { columns: 1, rows: 2 };
    } else if (totalCount === 3) {
      return { columns: 2, rows: 2 };
    } else if (totalCount <= 4) {
      return { columns: 2, rows: 2 };
    } else if (totalCount <= 6) {
      return { columns: 2, rows: 3 };
    } else {
      return { columns: 2, rows: Math.ceil(totalCount / 2) };
    }
  };

  const gridLayout = getGridLayout();

  // Get the main speaker for speaker view
  // If user selected a speaker, use that; otherwise default to first remote participant
  const getMainSpeaker = () => {
    if (selectedSpeakerId) {
      // Check if selected speaker is local user
      if (selectedSpeakerId === String(activeUserId)) {
        return localParticipant;
      }
      // Find selected remote participant
      const selected = remoteParticipants.find(p => p.id === selectedSpeakerId);
      if (selected) return selected;
    }
    // Default: first remote participant or local if alone
    return remoteParticipants.length > 0 ? remoteParticipants[0] : localParticipant;
  };
  const mainSpeaker = getMainSpeaker();
  const isMainSpeakerLocal = mainSpeaker?.id === String(activeUserId);

  // Other participants (excluding main speaker) for thumbnail strip
  const thumbnailParticipants = participants.filter(p => p.id !== mainSpeaker?.id);

  // Handler to select a participant as main speaker
  const handleSelectSpeaker = (participantId) => {
    setSelectedSpeakerId(participantId);
  };

  // Render remote participant video
  const renderRemoteVideo = (participant, style) => {
    const trackInfo = getVideoTrackForParticipant(participant);
    if (trackInfo && participant.isVideoOn) {
      return (
        <TwilioVideoParticipantView
          style={style}
          key={`remote-${participant.id}`}
          trackIdentifier={{
            participantSid: trackInfo.participantSid,
            videoTrackSid: trackInfo.videoTrackSid,
          }}
          scaleType="fill"
        />
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* TwilioVideo — single instance, never unmounts during the call lifecycle */}
      <TwilioVideo
        ref={twilioRef}
        onRoomDidConnect={_onRoomDidConnect}
        onRoomDidFailToConnect={_onRoomDidFailToConnect}
        onRoomDidDisconnect={_onRoomDidDisconnect}
        onRoomParticipantDidConnect={_onRoomParticipantDidConnect}
        onRoomParticipantDidDisconnect={_onRoomParticipantDidDisconnect}
        onParticipantAddedVideoTrack={_onParticipantAddedVideoTrack}
        onParticipantRemovedVideoTrack={_onParticipantRemovedVideoTrack}
        onParticipantEnabledVideoTrack={_onParticipantEnabledVideoTrack}
        onParticipantDisabledVideoTrack={_onParticipantDisabledVideoTrack}
        onParticipantEnabledAudioTrack={_onParticipantEnabledAudioTrack}
        onParticipantDisabledAudioTrack={_onParticipantDisabledAudioTrack}
        onDominantSpeakerDidChange={handleDominantSpeakerDidChange}
      />

      {/* Loading overlay */}
      {showLoading && (
        <View style={[StyleSheet.absoluteFill, styles.loadingContainer, { zIndex: 100 }]}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>
            {isConnecting
              ? t('videoConsultation.joining', 'Joining room...')
              : t('videoConsultation.validatingRoom', 'Validating room...')}
          </Text>
        </View>
      )}

      <View style={styles.content}>
        {/* Top Bar */}
        <TopBar
          callDuration={callDuration}
          sessionTimeRemaining={timeRemaining}
          participantCount={participants.length}
          connectionQuality={connectionQuality}
          layout={layout}
          onLayoutChange={handleLayoutChange}
          isRTL={i18n.language === 'ar'}
        />

        {/* Video Area - Speaker View or Gallery View */}
        <View style={styles.videoArea} key={`video-area-${layout}`}>
          {layout === 'speaker' ? (
            // SPEAKER VIEW: Large main video + thumbnail strip for other participants
            <View style={styles.speakerViewContainer}>
              {/* Main Speaker Video (large) */}
              <View style={[
                styles.mainSpeakerContainer,
                thumbnailParticipants.length > 0 && styles.mainSpeakerWithThumbnails
              ]}>
                {mainSpeaker ? (
                  // Show selected participant as main speaker
                  <View style={StyleSheet.absoluteFill}>
                    {isMainSpeakerLocal ? (
                      // Local user is main speaker
                      <>
                        <TwilioVideoLocalView
                          enabled={isVideoOn}
                          scaleType="fill"
                          style={styles.mainSpeakerVideo}
                        />
                        {!isVideoOn && (
                          <View style={styles.noVideoOverlay}>
                            <View style={[styles.avatarLarge, { backgroundColor: '#9B59B6' }]}>
                              <Text style={styles.avatarTextLarge}>{getInitials(userName)}</Text>
                            </View>
                            <Text style={styles.participantName}>{userName}</Text>
                            <Text style={styles.cameraOffText}>{t('videoConsultation.cameraOff', 'Camera Off')}</Text>
                          </View>
                        )}
                        <View style={styles.mainSpeakerInfo}>
                          <Text style={styles.mainSpeakerName}>{t('videoConsultation.you', 'You')}</Text>
                        </View>
                      </>
                    ) : (
                      // Remote participant is main speaker
                      <>
                        {renderRemoteVideo(mainSpeaker, styles.mainSpeakerVideo)}
                        {!mainSpeaker?.isVideoOn && (
                          <View style={styles.noVideoOverlay}>
                            <View style={[styles.avatarLarge, { backgroundColor: mainSpeaker?.role === 'provider' ? PRIMARY_COLOR : '#9B59B6' }]}>
                              <Text style={styles.avatarTextLarge}>{getInitials(mainSpeaker?.name)}</Text>
                            </View>
                            <Text style={styles.participantName}>{mainSpeaker?.name}</Text>
                            <Text style={styles.cameraOffText}>{t('videoConsultation.cameraOff', 'Camera Off')}</Text>
                          </View>
                        )}
                        <View style={styles.mainSpeakerInfo}>
                          <Text style={styles.mainSpeakerName}>{mainSpeaker?.name}</Text>
                          <View style={[styles.roleBadge, { backgroundColor: mainSpeaker?.role === 'provider' ? PRIMARY_COLOR : '#9B59B6' }]}>
                            <Text style={styles.roleText}>
                              {mainSpeaker?.role === 'provider' ? t('videoConsultation.doctor', 'Doctor') :
                               mainSpeaker?.role === 'patient' ? t('videoConsultation.patient', 'Patient') :
                               t('videoConsultation.guest', 'Guest')}
                            </Text>
                          </View>
                        </View>
                      </>
                    )}
                  </View>
                ) : (
                  // Waiting for provider
                  <View style={styles.noVideoOverlay}>
                    <Icon name="person-add" size={48} color="#64748B" />
                    <Text style={styles.waitingText}>
                      {t('video_conference.waiting_for_provider', 'Waiting for provider to join...')}
                    </Text>
                  </View>
                )}
              </View>

              {/* Thumbnail Strip - tap to select main speaker */}
              {thumbnailParticipants.length > 0 && (
                <View style={styles.thumbnailStripContainer}>
                  <Text style={styles.thumbnailHint}>{t('videoConsultation.tapToEnlarge', 'Tap to enlarge')}</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.thumbnailStrip}
                    contentContainerStyle={styles.thumbnailStripContent}
                  >
                    {thumbnailParticipants.map((participant) => {
                      const isLocal = participant.id === String(activeUserId);
                      return (
                        <TouchableOpacity
                          key={participant.id}
                          style={styles.thumbnailItem}
                          onPress={() => handleSelectSpeaker(participant.id)}
                          activeOpacity={0.7}
                        >
                          {isLocal ? (
                            // Local participant thumbnail
                            <>
                              <TwilioVideoLocalView
                                enabled={isVideoOn}
                                scaleType="fill"
                                style={styles.thumbnailVideo}
                              />
                              {!isVideoOn && (
                                <View style={[styles.thumbnailNoVideo, { backgroundColor: '#9B59B6' }]}>
                                  <Text style={styles.thumbnailAvatarText}>{getInitials(userName)}</Text>
                                </View>
                              )}
                              <View style={styles.thumbnailInfo}>
                                <Text style={styles.thumbnailName} numberOfLines={1}>
                                  {t('videoConsultation.you', 'You')}
                                </Text>
                                {isMuted && <Icon name="mic-off" size={8} color="#EF4444" />}
                              </View>
                              <View style={styles.thumbnailBorderYou} />
                            </>
                          ) : (
                            // Remote participant thumbnail
                            <>
                              {renderRemoteVideo(participant, styles.thumbnailVideo)}
                              {!participant.isVideoOn && (
                                <View style={[
                                  styles.thumbnailNoVideo,
                                  { backgroundColor: participant.role === 'provider' ? PRIMARY_COLOR : '#9B59B6' }
                                ]}>
                                  <Text style={styles.thumbnailAvatarText}>{getInitials(participant.name)}</Text>
                                </View>
                              )}
                              <View style={styles.thumbnailInfo}>
                                <Text style={styles.thumbnailName} numberOfLines={1}>{participant.name}</Text>
                                {participant.isMuted && <Icon name="mic-off" size={8} color="#EF4444" />}
                              </View>
                            </>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          ) : (
            // GALLERY VIEW: Equal-sized grid tiles for all participants
            <ScrollView
              style={styles.galleryScrollView}
              contentContainerStyle={styles.galleryContainer}
              showsVerticalScrollIndicator={false}
            >
              {/* Render all participants in grid */}
              {participants.length === 0 ? (
                <View style={styles.noVideoOverlay}>
                  <Text style={styles.waitingText}>
                    {t('video_conference.waiting_for_provider', 'Waiting for provider to join...')}
                  </Text>
                </View>
              ) : (
                <View style={styles.galleryGrid}>
                  {/* Local participant tile */}
                  <View style={[
                    styles.galleryTile,
                    {
                      width: participants.length === 1 ? '100%' :
                             participants.length === 2 ? '100%' : '48%',
                      height: participants.length <= 2 ? SCREEN_HEIGHT * 0.35 :
                              participants.length <= 4 ? SCREEN_HEIGHT * 0.28 : SCREEN_HEIGHT * 0.22,
                    }
                  ]}>
                    <TwilioVideoLocalView
                      enabled={isVideoOn}
                      scaleType="fill"
                      style={styles.galleryTileVideo}
                    />
                    {!isVideoOn && (
                      <View style={styles.galleryTileNoVideo}>
                        <View style={[styles.galleryTileAvatar, { backgroundColor: '#9B59B6' }]}>
                          <Text style={styles.galleryTileAvatarText}>{getInitials(userName)}</Text>
                        </View>
                      </View>
                    )}
                    <View style={styles.galleryTileInfo}>
                      <Text style={styles.galleryTileName} numberOfLines={1}>
                        {t('videoConsultation.you', 'You')}
                      </Text>
                      {isMuted && (
                        <View style={styles.galleryTileMuted}>
                          <Icon name="mic-off" size={10} color="white" />
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Remote participant tiles */}
                  {remoteParticipants.map((participant) => (
                    <View
                      key={participant.id}
                      style={[
                        styles.galleryTile,
                        {
                          width: participants.length === 2 ? '100%' : '48%',
                          height: participants.length <= 2 ? SCREEN_HEIGHT * 0.35 :
                                  participants.length <= 4 ? SCREEN_HEIGHT * 0.28 : SCREEN_HEIGHT * 0.22,
                        }
                      ]}
                    >
                      {renderRemoteVideo(participant, styles.galleryTileVideo)}
                      {!participant.isVideoOn && (
                        <View style={styles.galleryTileNoVideo}>
                          <View style={[styles.galleryTileAvatar, { backgroundColor: participant.role === 'provider' ? PRIMARY_COLOR : '#9B59B6' }]}>
                            <Text style={styles.galleryTileAvatarText}>{getInitials(participant.name)}</Text>
                          </View>
                        </View>
                      )}
                      <View style={styles.galleryTileInfo}>
                        <Text style={styles.galleryTileName} numberOfLines={1}>{participant.name}</Text>
                        <View style={[styles.galleryTileRole, { backgroundColor: participant.role === 'provider' ? PRIMARY_COLOR : '#9B59B6' }]}>
                          <Text style={styles.galleryTileRoleText}>
                            {participant.role === 'provider' ? t('videoConsultation.doctor', 'Dr') :
                             participant.role === 'patient' ? t('videoConsultation.patient', 'Patient') :
                             t('videoConsultation.guest', 'Guest')}
                          </Text>
                        </View>
                        {participant.isMuted && (
                          <View style={styles.galleryTileMuted}>
                            <Icon name="mic-off" size={10} color="white" />
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </View>

        {/* Control Bar */}
        <ControlBar
          isMuted={isMuted}
          isVideoOn={isVideoOn}
          isChatOpen={isChatOpen}
          unreadMessages={unreadMessages}
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          onToggleChat={handleToggleChat}
          onSwitchCamera={handleSwitchCamera}
          onOpenSettings={handleOpenSettings}
          onOpenInvitation={() => setIsInvitationOpen(true)}
          onEndCall={handleEndCall}
          isGuest={isGuest}
        />
      </View>

      {/* Chat Panel */}
      <ChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={chatMessages}
        participantCount={participants.length}
        onSendMessage={handleSendMessage}
        currentUserName={userName}
      />

      {/* Settings Modal */}
      <SettingsModal
        visible={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        audioDevices={audioDevices}
        videoDevices={videoDevices}
        selectedAudioDevice={selectedAudioDevice}
        selectedVideoDevice={selectedVideoDevice}
        onSelectAudioDevice={setSelectedAudioDevice}
        onSelectVideoDevice={setSelectedVideoDevice}
        onApplySettings={handleApplySettings}
      />

      {/* Invitation Modal */}
      <InvitationModal
        visible={isInvitationOpen}
        onClose={() => setIsInvitationOpen(false)}
        onSend={handleSendInvitation}
        isLoading={isSendingInvitation}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: {
    marginTop: 16,
    color: '#94A3B8',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
  },
  rejoinButton: {
    marginTop: 24,
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  rejoinButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  leaveButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  leaveButtonText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  videoArea: {
    flex: 1,
    position: 'relative',
  },
  noVideoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextLarge: {
    color: 'white',
    fontSize: 40,
    fontWeight: '700',
  },
  participantName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  cameraOffText: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 6,
  },
  waitingText: {
    color: '#94A3B8',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 12,
  },
  roleBadge: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  roleText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },

  // ========== SPEAKER VIEW STYLES ==========
  speakerViewContainer: {
    flex: 1,
    position: 'relative',
  },
  mainSpeakerContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
  },
  mainSpeakerWithThumbnails: {
    marginBottom: 8,
  },
  mainSpeakerVideo: {
    flex: 1,
    backgroundColor: '#000',
  },
  mainSpeakerInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  mainSpeakerName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Thumbnail strip container
  thumbnailStripContainer: {
    paddingTop: 4,
  },
  thumbnailHint: {
    color: '#64748B',
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 4,
  },
  // Thumbnail strip for other participants
  thumbnailStrip: {
    height: 72,
  },
  thumbnailStripContent: {
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  thumbnailItem: {
    width: 64,
    height: 68,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    marginHorizontal: 4,
    position: 'relative',
  },
  thumbnailVideo: {
    flex: 1,
    backgroundColor: '#000',
  },
  thumbnailNoVideo: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#9B59B6',
  },
  thumbnailAvatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  thumbnailInfo: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    right: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 3,
  },
  thumbnailName: {
    color: 'white',
    fontSize: 8,
    fontWeight: '500',
    flex: 1,
  },
  thumbnailBorderYou: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    borderRadius: 8,
  },

  // ========== GALLERY VIEW STYLES ==========
  galleryScrollView: {
    flex: 1,
  },
  galleryContainer: {
    flexGrow: 1,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 2,
  },
  galleryTile: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    marginBottom: 8,
    position: 'relative',
  },
  galleryTileVideo: {
    flex: 1,
    backgroundColor: '#000',
  },
  galleryTileNoVideo: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#334155',
  },
  galleryTileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryTileAvatarText: {
    color: 'white',
    fontSize: 22,
    fontWeight: '700',
  },
  galleryTileInfo: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  galleryTileName: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  galleryTileRole: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  galleryTileRoleText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '600',
  },
  galleryTileMuted: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CustomVideoConferenceScreen;
