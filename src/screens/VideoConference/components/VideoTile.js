import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  TwilioVideoLocalView,
  TwilioVideoParticipantView,
} from '@twilio/video-react-native-sdk';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';

const PRIMARY_COLOR = '#65bed6';

const VideoTile = ({
  participant,
  trackIdentifier,
  isLocal = false,
  isLarge = false,
  isSpeaking = false,
  showControls = true,
}) => {
  const { t } = useTranslation();

  const getRoleColor = (role) => {
    switch (role) {
      case 'doctor':
      case 'provider':
        return PRIMARY_COLOR;
      case 'patient':
        return '#9B59B6';
      case 'family':
        return '#3498DB';
      case 'specialist':
        return '#E67E22';
      case 'nurse':
        return '#1ABC9C';
      case 'guest':
        return '#8B5CF6';
      default:
        return '#95A5A6';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'doctor':
      case 'provider':
        return t('video_conference.role_doctor', 'Doctor');
      case 'patient':
        return t('video_conference.role_patient', 'Patient');
      case 'family':
        return t('video_conference.role_family', 'Family');
      case 'specialist':
        return t('video_conference.role_specialist', 'Specialist');
      case 'nurse':
        return t('video_conference.role_nurse', 'Nurse');
      case 'guest':
        return t('video_conference.role_guest', 'Guest');
      default:
        return t('video_conference.role_participant', 'Participant');
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const avatarSize = isLarge ? 120 : 80;
  const fontSize = isLarge ? 48 : 32;

  return (
    <View style={[styles.container, isSpeaking && styles.speaking]}>
      {/* Video View */}
      {participant?.isVideoOn ? (
        isLocal ? (
          <TwilioVideoLocalView
            enabled={true}
            style={styles.video}
            scaleType="fill"
          />
        ) : trackIdentifier ? (
          <TwilioVideoParticipantView
            trackIdentifier={trackIdentifier}
            style={styles.video}
            scaleType="fill"
          />
        ) : (
          <View style={styles.noVideoContainer}>
            <View
              style={[
                styles.avatar,
                {
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                  backgroundColor: getRoleColor(participant?.role),
                },
              ]}
            >
              <Text style={[styles.avatarText, { fontSize }]}>
                {getInitials(participant?.name)}
              </Text>
            </View>
          </View>
        )
      ) : (
        <View style={styles.noVideoContainer}>
          <View
            style={[
              styles.avatar,
              {
                width: avatarSize,
                height: avatarSize,
                borderRadius: avatarSize / 2,
                backgroundColor: getRoleColor(participant?.role),
              },
            ]}
          >
            <Text style={[styles.avatarText, { fontSize }]}>
              {getInitials(participant?.name)}
            </Text>
          </View>
          {!participant?.isVideoOn && (
            <Text style={styles.cameraOffText}>
              {t('video_conference.camera_off', 'Camera Off')}
            </Text>
          )}
        </View>
      )}

      {/* Participant Info Badge */}
      {showControls && (
        <View style={styles.infoContainer}>
          <View
            style={[
              styles.speakingIndicator,
              { backgroundColor: isSpeaking ? '#22C55E' : '#64748B' },
            ]}
          />
          <Text style={styles.nameText} numberOfLines={1}>
            {isLocal ? t('video_conference.you', 'You') : participant?.name}
          </Text>
          <View
            style={[
              styles.roleBadge,
              { backgroundColor: getRoleColor(participant?.role) },
            ]}
          >
            <Text style={styles.roleText}>{getRoleLabel(participant?.role)}</Text>
          </View>
        </View>
      )}

      {/* Status Badges */}
      {showControls && (
        <View style={styles.statusContainer}>
          {participant?.isMuted && (
            <View style={[styles.statusBadge, styles.mutedBadge]}>
              <Icon name="mic-off" size={12} color="white" />
            </View>
          )}
          {isLocal && (
            <View style={[styles.statusBadge, styles.youBadge]}>
              <Text style={styles.youBadgeText}>
                {t('video_conference.you_badge', 'You')}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  speaking: {
    borderWidth: 3,
    borderColor: PRIMARY_COLOR,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  video: {
    flex: 1,
    backgroundColor: '#000',
  },
  noVideoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: 'white',
    fontWeight: '700',
  },
  cameraOffText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 8,
  },
  infoContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
    flexWrap: 'wrap',
  },
  speakingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nameText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
  },
  statusContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 6,
  },
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  mutedBadge: {
    backgroundColor: '#EF4444',
  },
  youBadge: {
    backgroundColor: PRIMARY_COLOR,
    width: 'auto',
    paddingHorizontal: 8,
  },
  youBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
  },
});

export default VideoTile;
