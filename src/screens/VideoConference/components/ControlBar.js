import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import COLORS from '../../../constants/colors';

const PRIMARY_COLOR = '#65bed6';

const ControlButton = ({ icon, onPress, active = false, danger = false, muted = false, badge = null, size = 44 }) => {
  const getBackgroundColor = () => {
    if (danger) return '#EF4444';
    if (muted) return '#EF4444';
    if (active) return PRIMARY_COLOR;
    return 'rgba(255, 255, 255, 0.1)';
  };

  return (
    <TouchableOpacity
      style={[
        styles.controlButton,
        { backgroundColor: getBackgroundColor(), width: size, height: size, borderRadius: size / 2 },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Icon name={icon} size={22} color="white" />
      {badge !== null && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const ActionButton = ({ icon, label, onPress, primary = false }) => (
  <TouchableOpacity
    style={[styles.actionButton, primary && styles.actionButtonPrimary]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Icon name={icon} size={18} color="white" />
    <Text style={styles.actionButtonText}>{label}</Text>
  </TouchableOpacity>
);

const ControlBar = ({
  isMuted,
  isVideoOn,
  isChatOpen,
  isScreenSharing,
  unreadMessages = 0,
  onToggleMute,
  onToggleVideo,
  onToggleChat,
  onToggleScreenShare,
  onOpenSettings,
  onOpenInvitation,
  onSwitchCamera,
  onEndCall,
  isGuest = false,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.controlsRow}>
        {/* Mute Button */}
        <ControlButton
          icon={isMuted ? 'mic-off' : 'mic'}
          onPress={onToggleMute}
          muted={isMuted}
        />

        {/* Video Button */}
        <ControlButton
          icon={isVideoOn ? 'videocam' : 'videocam-off'}
          onPress={onToggleVideo}
          muted={!isVideoOn}
        />

        {/* Switch Camera */}
        <ControlButton
          icon="flip-camera-ios"
          onPress={onSwitchCamera}
        />

        {/* Chat Button */}
        <ControlButton
          icon="chat"
          onPress={onToggleChat}
          active={isChatOpen}
          badge={!isChatOpen ? unreadMessages : null}
        />

        {/* Settings Button */}
        <ControlButton
          icon="settings"
          onPress={onOpenSettings}
        />

        {/* Divider */}
        {!isGuest && <View style={styles.divider} />}

        {/* Invite Button - Only for non-guests */}
        {!isGuest && (
          <ActionButton
            icon="person-add"
            label={t('video_conference.invite', 'Invite')}
            onPress={onOpenInvitation}
            primary
          />
        )}

        {/* Divider */}
        <View style={styles.divider} />

        {/* End Call Button */}
        <ControlButton
          icon="call-end"
          onPress={onEndCall}
          danger
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonPrimary: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 4,
  },
});

export default ControlBar;
