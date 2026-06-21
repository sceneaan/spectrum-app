import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Alert,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useCheckRoomId, useSendInvitation } from '../api/services/Appointment.Service';
import { getVideoToken } from '../api/services/Video.Service';
import {
  TwilioVideo,
  TwilioVideoLocalView,
  TwilioVideoParticipantView,
} from '@twilio/video-react-native-sdk';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import socketService from '../utils/socket';
import Icon from 'react-native-vector-icons/MaterialIcons';
import COLORS from '../constants/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const VideoConsultationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();
  const { meetingRoomId, userID, userName } = route?.params || {};

  // Twilio Video ref
  const twilioRef = useRef(null);

  // State
  const [room, setRoom] = useState({});
  const [joinMeeting, setJoinMeeting] = useState(false);
  const [isRoomExpired, setIsRoomExpired] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Media state
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // Remote participant video tracks
  const [videoTracks, setVideoTracks] = useState(new Map());
  const [remoteParticipants, setRemoteParticipants] = useState([]);

  // Timer state
  const [remainingTime, setRemainingTime] = useState(null);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [gracePeriodActive, setGracePeriodActive] = useState(false);

  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatMessage, setChatMessage] = useState('');

  // Invitation state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+966');

  const { mutate: sendInvitation, isPending: isSending } = useSendInvitation();

  // Check room validity
  const {
    data: roomIdCheck,
    isLoading: roomIdCheckLoader,
    error: roomIdCheckError,
  } = useCheckRoomId(meetingRoomId);

  // Check permissions
  const checkPermissions = async () => {
    if (Platform.OS === 'android') {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.CAMERA,
      ]);

      const allGranted = Object.values(results).every(
        result => result === PermissionsAndroid.RESULTS.GRANTED
      );

      if (!allGranted) {
        Alert.alert(
          t('videoConsultation.error') || 'Error',
          t('videoConsultation.permissionsRequired') || 'Camera and microphone permissions are required'
        );
        navigation.goBack();
        return false;
      }
    } else if (Platform.OS === 'ios') {
      const cameraResult = await request(PERMISSIONS.IOS.CAMERA);
      const micResult = await request(PERMISSIONS.IOS.MICROPHONE);

      if (cameraResult !== RESULTS.GRANTED || micResult !== RESULTS.GRANTED) {
        Alert.alert(
          t('videoConsultation.error') || 'Error',
          t('videoConsultation.permissionsRequired') || 'Camera and microphone permissions are required'
        );
        navigation.goBack();
        return false;
      }
    }
    return true;
  };

  // Connect to Twilio room
  const initializeAndJoin = async () => {
    try {
      setIsConnecting(true);
      console.log('[Video] Connecting to Twilio room...');

      // Get Twilio token from server
      const tokenData = await getVideoToken(meetingRoomId);
      if (__DEV__) console.log('[Video] Token received');

      // Connect via TwilioVideo ref
      twilioRef.current.connect({
        accessToken: tokenData.token,
        roomName: tokenData.roomName,
        enableNetworkQualityReporting: true,
        dominantSpeakerEnabled: true,
      });

    } catch (error) {
      console.error('[Video] Error connecting:', error);
      Alert.alert('Error', 'Failed to join video room: ' + error.message);
      setIsConnecting(false);
    }
  };

  // --- Twilio Event Handlers ---

  // Room connected
  const handleRoomDidConnect = ({ roomName, roomSid }) => {
    console.log('[Video] Connected to room:', roomName);
    setIsJoined(true);
    setIsConnecting(false);

    // Notify socket
    if (socketService.isConnected()) {
      socketService.sendMessage('joinRoom', {
        roomId: meetingRoomId,
        userId: userID,
      });
    }
  };

  // Room connection failed
  const handleRoomDidFailToConnect = (error) => {
    console.error('[Video] Failed to connect:', error);
    setIsConnecting(false);
    Alert.alert('Error', 'Failed to join room: ' + (error?.error || 'Unknown error'));
  };

  // Room disconnected
  const handleRoomDidDisconnect = ({ error }) => {
    console.log('[Video] Disconnected from room', error);
    setIsJoined(false);
    setVideoTracks(new Map());
    setRemoteParticipants([]);
  };

  // Participant connected
  const handleParticipantDidConnect = (participant) => {
    console.log('[Video] Participant connected:', participant.identity);
    setRemoteParticipants(prev => [...prev, participant]);
  };

  // Participant disconnected
  const handleParticipantDidDisconnect = (participant) => {
    console.log('[Video] Participant disconnected:', participant.identity);
    setRemoteParticipants(prev => prev.filter(p => p.participantSid !== participant.participantSid));
  };

  // Remote video track added
  const handleParticipantAddedVideoTrack = ({ participant, track }) => {
    console.log('[Video] Video track added:', track.trackSid, 'from:', participant.identity);
    setVideoTracks(prev => new Map([...prev, [track.trackSid, {
      participantSid: participant.participantSid,
      videoTrackSid: track.trackSid,
    }]]));
  };

  // Remote video track removed
  const handleParticipantRemovedVideoTrack = ({ participant, track }) => {
    console.log('[Video] Video track removed:', track.trackSid);
    setVideoTracks(prev => {
      const next = new Map(prev);
      next.delete(track.trackSid);
      return next;
    });
  };

  // Remote video enabled/disabled
  const handleParticipantEnabledVideoTrack = ({ participant, track }) => {
    console.log('[Video] Participant enabled video:', participant.identity);
  };

  const handleParticipantDisabledVideoTrack = ({ participant, track }) => {
    console.log('[Video] Participant disabled video:', participant.identity);
  };

  // Remote audio enabled/disabled
  const handleParticipantEnabledAudioTrack = ({ participant, track }) => {
    console.log('[Video] Participant enabled audio:', participant.identity);
  };

  const handleParticipantDisabledAudioTrack = ({ participant, track }) => {
    console.log('[Video] Participant disabled audio:', participant.identity);
  };

  // Dominant speaker changed (new feature)
  const handleDominantSpeakerDidChange = ({ roomName, roomSid, participant }) => {
    console.log('[Video] Dominant speaker:', participant?.identity);
  };

  // Network quality changed
  const handleNetworkQualityLevelsChanged = ({ participant, isLocalUser, quality }) => {
    if (isLocalUser) {
      console.log('[Video] Local network quality:', quality);
    }
  };

  // --- Media Controls ---

  const toggleMicrophone = () => {
    const newState = !isMuted;
    twilioRef.current?.setLocalAudioEnabled(!newState);
    setIsMuted(newState);
  };

  const toggleCamera = () => {
    const newState = !isVideoOn;
    twilioRef.current?.setLocalVideoEnabled(newState);
    setIsVideoOn(newState);
  };

  const switchCamera = () => {
    twilioRef.current?.flipCamera();
    setIsFrontCamera(prev => !prev);
  };

  const toggleSpeaker = () => {
    const newState = !isSpeakerOn;
    twilioRef.current?.toggleSoundSetup(newState);
    setIsSpeakerOn(newState);
  };

  // Handle leaving the room
  const handleLeaveRoom = async () => {
    try {
      twilioRef.current?.disconnect();

      if (socketService.isConnected()) {
        socketService.sendMessage('leaveRoom', {
          roomId: meetingRoomId,
          userId: userID,
        });
      }

      navigation.goBack();
    } catch (error) {
      console.error('[Video] Error leaving room:', error);
      navigation.goBack();
    }
  };

  // Permission check effect
  useEffect(() => {
    checkPermissions();
  }, []);

  // Room validation effect
  useEffect(() => {
    if (roomIdCheck) {
      console.log('[Video] Room check result:', roomIdCheck);
      setRoom(roomIdCheck?.room);

      const currentTime = new Date();
      const endTime = new Date(roomIdCheck?.room?.endTime);

      if (endTime < currentTime) {
        setIsRoomExpired(true);
        Alert.alert(
          t('videoConsultation.roomExpired') || 'Room Expired',
          t('videoConsultation.consultationEnded') || 'This consultation has ended.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        setJoinMeeting(true);
      }
    }
  }, [roomIdCheck]);

  // Initialize when ready to join
  useEffect(() => {
    if (joinMeeting && !isRoomExpired && meetingRoomId && userID) {
      initializeAndJoin();
    }

    return () => {
      // Cleanup on unmount
      twilioRef.current?.disconnect();
    };
  }, [joinMeeting, isRoomExpired, meetingRoomId, userID]);

  // Timer effect for countdown
  useEffect(() => {
    if (!room?.endTime || isRoomExpired) return;

    const GRACE_PERIOD_MS = 30000;
    const WARNING_THRESHOLD_MS = 60000;
    let gracePeriodTimer = null;

    const calculateRemainingTime = () => {
      const now = new Date();
      const endTime = new Date(room.endTime);
      const timeDiff = endTime - now;

      if (timeDiff > 0 && timeDiff <= WARNING_THRESHOLD_MS && !showTimeWarning) {
        setShowTimeWarning(true);
      } else if (timeDiff > WARNING_THRESHOLD_MS && showTimeWarning) {
        setShowTimeWarning(false);
      }

      if (timeDiff <= 0) {
        if (!gracePeriodActive) {
          setGracePeriodActive(true);
          gracePeriodTimer = setTimeout(() => {
            setIsRoomExpired(true);
            setRemainingTime(null);
            handleLeaveRoom();
          }, GRACE_PERIOD_MS);

          const absTimeDiff = Math.abs(timeDiff);
          const hours = Math.floor(absTimeDiff / (1000 * 60 * 60));
          const minutes = Math.floor((absTimeDiff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((absTimeDiff % (1000 * 60)) / 1000);

          setRemainingTime({
            hours: hours.toString().padStart(2, '0'),
            minutes: minutes.toString().padStart(2, '0'),
            seconds: seconds.toString().padStart(2, '0'),
            isNegative: true,
          });
        }
      } else {
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        setRemainingTime({
          hours: hours.toString().padStart(2, '0'),
          minutes: minutes.toString().padStart(2, '0'),
          seconds: seconds.toString().padStart(2, '0'),
          isNegative: false,
        });
      }
    };

    calculateRemainingTime();
    const timer = setInterval(calculateRemainingTime, 1000);

    return () => {
      clearInterval(timer);
      if (gracePeriodTimer) clearTimeout(gracePeriodTimer);
    };
  }, [room?.endTime, isRoomExpired, gracePeriodActive, showTimeWarning]);

  // Handle send invitation
  const handleSendInvitation = () => {
    if (!phoneNumber.trim()) {
      Alert.alert(
        t('common.error') || 'Error',
        t('videoConsultation.enterPhoneNumber') || 'Please enter a phone number'
      );
      return;
    }

    const fullPhone = `${countryCode}${phoneNumber}`;

    sendInvitation(
      {
        roomId: meetingRoomId,
        phoneNumber: fullPhone,
        providerName: room?.providerName || userName,
      },
      {
        onSuccess: () => {
          Alert.alert(
            t('common.success') || 'Success',
            t('videoConsultation.invitationSent') || 'Invitation sent successfully'
          );
          setShowInviteForm(false);
          setPhoneNumber('');
        },
        onError: (error) => {
          Alert.alert(
            t('common.error') || 'Error',
            error?.message || t('videoConsultation.invitationFailed') || 'Failed to send invitation'
          );
        },
      }
    );
  };

  // Error state
  if (roomIdCheckError) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>
          {t('videoConsultation.invalidRoom') || 'Invalid room or room not found'}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Loading state
  if (roomIdCheckLoader || isConnecting) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
          {isConnecting
            ? t('videoConsultation.joining') || 'Joining room...'
            : t('videoConsultation.validatingRoom') || 'Validating room...'}
        </Text>
      </SafeAreaView>
    );
  }

  // Missing parameters
  if (!meetingRoomId || !userID || !userName) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>
          {t('videoConsultation.missingParameters') || 'Missing required parameters'}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const remoteVideoTracksList = Array.from(videoTracks.values());

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Twilio Video Component (invisible — manages connection) */}
      <TwilioVideo
        ref={twilioRef}
        onRoomDidConnect={handleRoomDidConnect}
        onRoomDidDisconnect={handleRoomDidDisconnect}
        onRoomDidFailToConnect={handleRoomDidFailToConnect}
        onRoomParticipantDidConnect={handleParticipantDidConnect}
        onRoomParticipantDidDisconnect={handleParticipantDidDisconnect}
        onParticipantAddedVideoTrack={handleParticipantAddedVideoTrack}
        onParticipantRemovedVideoTrack={handleParticipantRemovedVideoTrack}
        onParticipantEnabledVideoTrack={handleParticipantEnabledVideoTrack}
        onParticipantDisabledVideoTrack={handleParticipantDisabledVideoTrack}
        onParticipantEnabledAudioTrack={handleParticipantEnabledAudioTrack}
        onParticipantDisabledAudioTrack={handleParticipantDisabledAudioTrack}
        onDominantSpeakerDidChange={handleDominantSpeakerDidChange}
        onNetworkQualityLevelsChanged={handleNetworkQualityLevelsChanged}
      />

      <View style={styles.videoContainer}>
        {/* Remote Video (Full Screen) */}
        <View style={styles.remoteVideoContainer}>
          {remoteVideoTracksList.length > 0 ? (
            <TwilioVideoParticipantView
              style={styles.remoteVideo}
              trackIdentifier={remoteVideoTracksList[0]}
              scaleType="fill"
            />
          ) : (
            <View style={styles.waitingContainer}>
              <Icon name="person-outline" size={80} color="#666" />
              <Text style={styles.waitingText}>
                {t('videoConsultation.waitingForProvider') || 'Waiting for provider to join...'}
              </Text>
            </View>
          )}
        </View>

        {/* Local Video (Small overlay) */}
        <View style={styles.localVideoContainer}>
          {isVideoOn ? (
            <TwilioVideoLocalView
              enabled={true}
              style={styles.localVideo}
              scaleType="fill"
            />
          ) : (
            <View style={styles.localVideoOff}>
              <Icon name="videocam-off" size={30} color="#fff" />
            </View>
          )}
        </View>

        {/* Timer Overlay */}
        {remainingTime && (
          <View style={[
            styles.timerOverlay,
            showTimeWarning && styles.timerOverlayWarning,
            remainingTime.isNegative && styles.timerOverlayExpired,
          ]}>
            <View style={styles.timerContainer}>
              <Icon name="timer" size={16} color="white" />
              <Text style={styles.timerText}>
                {remainingTime.isNegative ? '-' : ''}
                {remainingTime.hours}:{remainingTime.minutes}:{remainingTime.seconds}
              </Text>
            </View>
          </View>
        )}

        {/* Remote User Info */}
        {remoteParticipants.length > 0 && (
          <View style={styles.remoteUserInfo}>
            <Icon name="person" size={16} color="white" />
            <Text style={styles.remoteUserName}>
              {remoteParticipants[0]?.identity || 'Provider'}
            </Text>
          </View>
        )}

        {/* Control Bar */}
        <View style={styles.controlBar}>
          {/* Mute Button */}
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={toggleMicrophone}
          >
            <Icon name={isMuted ? 'mic-off' : 'mic'} size={26} color="white" />
          </TouchableOpacity>

          {/* Video Button */}
          <TouchableOpacity
            style={[styles.controlButton, !isVideoOn && styles.controlButtonActive]}
            onPress={toggleCamera}
          >
            <Icon name={isVideoOn ? 'videocam' : 'videocam-off'} size={26} color="white" />
          </TouchableOpacity>

          {/* Switch Camera Button */}
          <TouchableOpacity style={styles.controlButton} onPress={switchCamera}>
            <Icon name="flip-camera-ios" size={26} color="white" />
          </TouchableOpacity>

          {/* Speaker Button */}
          <TouchableOpacity
            style={[styles.controlButton, !isSpeakerOn && styles.controlButtonActive]}
            onPress={toggleSpeaker}
          >
            <Icon name={isSpeakerOn ? 'volume-up' : 'volume-off'} size={26} color="white" />
          </TouchableOpacity>

          {/* Chat Button */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setShowChat(true)}
          >
            <Icon name="chat" size={26} color="white" />
          </TouchableOpacity>

          {/* Invite Button */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setShowInviteForm(true)}
          >
            <Icon name="person-add" size={26} color="white" />
          </TouchableOpacity>

          {/* End Call Button */}
          <TouchableOpacity
            style={[styles.controlButton, styles.endCallButton]}
            onPress={handleLeaveRoom}
          >
            <Icon name="call-end" size={26} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Invitation Modal */}
      <Modal
        visible={showInviteForm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInviteForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t('videoConsultation.sendInvitation') || 'Send Invitation'}
              </Text>
              <TouchableOpacity onPress={() => setShowInviteForm(false)}>
                <Icon name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>
              {t('videoConsultation.phoneNumber') || 'Phone Number'}
            </Text>

            <View style={styles.phoneInputContainer}>
              <View style={styles.countryCodeContainer}>
                <Text style={styles.countryCodeText}>{countryCode}</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="5XXXXXXXX"
                placeholderTextColor={COLORS.gray500}
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                maxLength={15}
              />
            </View>

            <TouchableOpacity
              style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
              onPress={handleSendInvitation}
              disabled={isSending}
            >
              {isSending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>
                  {t('videoConsultation.send') || 'Send'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Chat Modal */}
      <Modal
        visible={showChat}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChat(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.chatOverlay}
        >
          <View style={styles.chatContainer}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatTitle}>
                {t('videoConsultation.chat') || 'Chat'}
              </Text>
              <TouchableOpacity onPress={() => setShowChat(false)}>
                <Icon name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            <View style={styles.chatMessagesContainer}>
              <Text style={styles.chatPlaceholder}>
                Chat messages will appear here
              </Text>
            </View>
            <View style={styles.chatInputContainer}>
              <TextInput
                style={styles.chatInput}
                placeholder="Type a message..."
                placeholderTextColor="#999"
                value={chatMessage}
                onChangeText={setChatMessage}
              />
              <TouchableOpacity style={styles.chatSendButton}>
                <Icon name="send" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  remoteVideoContainer: {
    flex: 1,
    backgroundColor: '#2a2a2a',
  },
  remoteVideo: {
    flex: 1,
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
  },
  waitingText: {
    color: '#888',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  localVideoContainer: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  localVideo: {
    flex: 1,
  },
  localVideoOff: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#444',
  },
  timerOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timerOverlayWarning: {
    backgroundColor: 'rgba(255, 152, 0, 0.8)',
  },
  timerOverlayExpired: {
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  remoteUserInfo: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  remoteUserName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  controlBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    gap: 8,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#EF4444',
  },
  endCallButton: {
    backgroundColor: '#EF4444',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  countryCodeContainer: {
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 10,
    justifyContent: 'center',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Chat styles
  chatOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  chatContainer: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: 400,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  chatMessagesContainer: {
    flex: 1,
    padding: 16,
    minHeight: 200,
  },
  chatPlaceholder: {
    color: '#666',
    textAlign: 'center',
    marginTop: 50,
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: 'white',
    fontSize: 16,
  },
  chatSendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
});

export default VideoConsultationScreen;
